import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, MAX_PRODUITS_GRATUIT } from "@/lib/rules";

function slugifier(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      id?: string;
      nom: string;
      description?: string | null;
      prix: number;
      unite?: string;
      stock?: number | null;
      categorie?: string | null;
      image?: string | null;
    };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });

    const { data: vendeur } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .single();
    if (!vendeur) return NextResponse.json({ erreur: "Aucune boutique trouvée." }, { status: 404 });

    if (body.id) {
      const { error } = await supabase
        .from("produits")
        .update({
          nom: body.nom,
          description: body.description ?? null,
          prix: body.prix,
          unite: body.unite ?? "piece",
          stock: body.stock ?? null,
          categorie: body.categorie ?? null,
          image: body.image ?? null,
        })
        .eq("id", body.id)
        .eq("vendeur_id", vendeur.id);
      if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
    } else {
      const { data: abo } = await supabase
        .from("abonnements")
        .select("plan")
        .eq("vendeur_id", vendeur.id)
        .eq("statut", "actif")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const planId = (abo?.plan ?? "gratuit") as keyof typeof PLANS;
      const planMax = PLANS[planId]?.max_produits ?? MAX_PRODUITS_GRATUIT;
      const max = Number.isFinite(planMax) ? (planMax as number) : 9999;

      const { count, error: countError } = await supabase
        .from("produits")
        .select("*", { count: "exact", head: true })
        .eq("vendeur_id", vendeur.id)
        .eq("statut", "actif");

      if (countError) return NextResponse.json({ erreur: countError.message }, { status: 500 });
      if ((count ?? 0) >= max) {
        return NextResponse.json(
          { erreur: `Limite atteinte (${max} produits max). Passez à un abonnement supérieur.` },
          { status: 400 }
        );
      }

      const slug = `${slugifier(body.nom)}-${vendeur.id.slice(0, 6)}-${Date.now()}`;

      const { error: insertError } = await supabase.from("produits").insert({
        vendeur_id: vendeur.id,
        nom: body.nom,
        slug,
        description: body.description ?? null,
        prix: body.prix,
        unite: body.unite ?? "piece",
        stock: body.stock ?? null,
        categorie: body.categorie ?? null,
        image: body.image ?? null,
        statut: "actif",
      });

      if (insertError) return NextResponse.json({ erreur: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("id");
    if (!produitId) return NextResponse.json({ erreur: "ID manquant." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return NextResponse.json({ erreur: "Boutique introuvable." }, { status: 404 });

    const { error } = await supabase
      .from("produits")
      .delete()
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("id");
    const statut = searchParams.get("statut") as "actif" | "inactif" | null;
    if (!produitId || !statut) return NextResponse.json({ erreur: "Paramètres manquants." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return NextResponse.json({ erreur: "Boutique introuvable." }, { status: 404 });

    const { error } = await supabase
      .from("produits")
      .update({ statut })
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
