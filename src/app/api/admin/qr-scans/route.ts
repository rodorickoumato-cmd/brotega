/**
 * API: GET /api/admin/qr-scans - Codes générés par scan QR
 * ✅ Admin seulement (JWT)
 * ✅ Filtre optionnel ?campagne=
 * ✅ Jeton et IP jamais renvoyés
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyJWT } from "@/lib/jwt-secure";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { erreur: "Accès refusé - admin seulement" },
        { status: 403 }
      );
    }

    const rawCampagne = req.nextUrl.searchParams.get("campagne") || "";
    const campagne = /^[a-z0-9_-]{1,50}$/i.test(rawCampagne) ? rawCampagne.toLowerCase() : null;

    // qr_scans absent de database.types → client non typé
    const admin = createAdminClient() as unknown as SupabaseClient;

    let query = admin
      .from("qr_scans")
      .select("id, code, campagne, nom, nom_saisi_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(500);
    if (campagne) query = query.eq("campagne", campagne);

    const [{ data, error, count }, { data: toutes }] = await Promise.all([
      query,
      admin.from("qr_scans").select("campagne").limit(10000),
    ]);

    if (error) {
      console.error("[QR] Admin list error:", error);
      return NextResponse.json({ erreur: "Erreur chargement" }, { status: 500 });
    }

    const campagnes = Array.from(
      new Set((toutes || []).map((r: { campagne: string }) => r.campagne))
    ).sort();

    return NextResponse.json({ total: count || 0, scans: data || [], campagnes });
  } catch (err) {
    console.error("[GET /api/admin/qr-scans]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
