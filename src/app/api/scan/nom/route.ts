/**
 * API: Scan QR → enregistrement optionnel du nom
 * - Requiert le jeton secret reçu à la génération du code
 * - Nom enregistrable une seule fois
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { validerCodeScan } from "@/lib/orderCode";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const rateCheck = await checkRateLimit(ip, RATE_LIMITS.QR_NOM);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { erreur: "Trop de tentatives. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
    const token = typeof body.token === "string" ? body.token : "";
    const nom = typeof body.nom === "string"
      ? body.nom.normalize("NFC").replace(/[<>]/g, "").replace(/\s+/g, " ").trim()
      : "";

    if (!validerCodeScan(code) || !/^[a-f0-9]{48}$/.test(token)) {
      return NextResponse.json({ erreur: "Code invalide" }, { status: 400 });
    }
    if (nom.length < 2 || nom.length > 80 || !/^[\p{L}\p{M}' .-]+$/u.test(nom)) {
      return NextResponse.json(
        { erreur: "Nom : 2-80 caractères (lettres, espaces, apostrophes, tirets)" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    // qr_scans absent de database.types → client non typé
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from("qr_scans")
      .update({ nom, nom_saisi_at: new Date().toISOString() })
      .eq("code", code)
      .eq("token_hash", tokenHash)
      .is("nom", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[QR] Update error:", error);
      return NextResponse.json({ erreur: "Erreur enregistrement" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { erreur: "Code introuvable ou nom déjà enregistré" },
        { status: 404 }
      );
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("[POST /api/scan/nom]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
