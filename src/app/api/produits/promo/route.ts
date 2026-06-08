import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
  if (!vendeur) return NextResponse.json({ erreur: "Boutique introuvable." }, { status: 404 });

  const body = await req.json() as {
    id: string;
    prix_promo: number | null;
    promo_actif: boolean;
    promo_fin: string | null;
  };

  if (!body.id) return NextResponse.json({ erreur: "ID requis." }, { status: 400 });

  if (body.promo_actif && (!body.prix_promo || body.prix_promo <= 0)) {
    return NextResponse.json({ erreur: "Prix promotionnel invalide." }, { status: 400 });
  }

  const { error } = await supabase
    .from("produits")
    .update({
      prix_promo:  body.promo_actif ? body.prix_promo : null,
      promo_actif: body.promo_actif,
      promo_fin:   body.promo_actif ? (body.promo_fin ?? null) : null,
    })
    .eq("id", body.id)
    .eq("vendeur_id", vendeur.id);

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ succes: true });
}
