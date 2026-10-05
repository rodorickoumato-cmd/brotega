/**
 * API: Scan QR → génération d'un code unique
 * - Rate limiting par IP
 * - Code QR-XXXXXX unique (retry si collision)
 * - Jeton secret renvoyé une seule fois, stocké hashé (SHA-256)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererCodeScan } from "@/lib/orderCode";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/validation";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const rateCheck = await checkRateLimit(ip, RATE_LIMITS.QR_SCAN);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { erreur: "Trop de scans. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCampagne = typeof body.campagne === "string" ? body.campagne : "";
    const campagne = /^[a-z0-9_-]{1,50}$/i.test(rawCampagne)
      ? rawCampagne.toLowerCase()
      : "general";

    const token = crypto.randomBytes(24).toString("hex");
    // qr_scans absent de database.types → client non typé
    const admin = createAdminClient() as unknown as SupabaseClient;

    for (let tentative = 0; tentative < 3; tentative++) {
      const code = genererCodeScan();
      const { error } = await admin
        .from("qr_scans")
        .insert([{
          code,
          campagne,
          token_hash: sha256(token),
          ip_hash: sha256(ip),
          user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
        }]);

      if (!error) {
        return NextResponse.json({ succes: true, code, token }, { status: 201 });
      }
      // 23505 = unique_violation → nouveau code
      if (error.code !== "23505") {
        console.error("[QR] Insert error:", error);
        break;
      }
    }

    return NextResponse.json({ erreur: "Erreur génération du code" }, { status: 500 });
  } catch (err) {
    console.error("[POST /api/scan]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
