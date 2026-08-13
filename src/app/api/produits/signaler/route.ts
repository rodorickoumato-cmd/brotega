import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Signalement d'un produit par un utilisateur connecté — modération a
// posteriori (voir migration 010). Ne modifie jamais le produit lui-même :
// l'admin traite le signalement depuis /admin/produits.
export async function POST(request: NextRequest) {
  try {
    const input = await request.json() as { produit_id?: string; motif?: string };
    if (!input.produit_id || !input.motif?.trim()) {
      return NextResponse.json({ erreur: "Produit et motif requis." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Connectez-vous pour signaler un produit." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("signalements_produits").insert({
      produit_id: input.produit_id,
      utilisateur_id: user.id,
      motif: input.motif.trim().slice(0, 500),
    });

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
