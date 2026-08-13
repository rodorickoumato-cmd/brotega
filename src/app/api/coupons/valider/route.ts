import { NextRequest, NextResponse } from "next/server";
import { validerCoupon } from "@/lib/coupons";

// Aperçu checkout uniquement — le total final est toujours recalculé et
// revalidé côté serveur dans POST /api/commandes, jamais dérivé de cet appel.
export async function POST(request: NextRequest) {
  try {
    const input = await request.json() as {
      code?: string;
      sous_total_xaf?: number;
      frais_livraison_xaf?: number;
    };

    if (!input.code || typeof input.sous_total_xaf !== "number") {
      return NextResponse.json({ ok: false, erreur: "Requête invalide." }, { status: 400 });
    }

    const resultat = await validerCoupon(
      input.code,
      input.sous_total_xaf,
      input.frais_livraison_xaf ?? 0
    );

    if (!resultat.ok) return NextResponse.json(resultat, { status: 400 });
    return NextResponse.json(resultat);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
