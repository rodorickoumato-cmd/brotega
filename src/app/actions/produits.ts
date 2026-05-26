"use server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, MAX_PRODUITS_GRATUIT } from "@/lib/rules";

type ProduitInput = {
  id?: string;
  nom: string;
  description?: string | null;
  prix: number;
  unite?: string;
  stock?: number | null;
  categorie?: string | null;
  image?: string | null;
};

export async function sauvegarderProduit(produit: ProduitInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .single();
    if (!vendeur) return { erreur: "Aucune boutique trouvée." };

    if (produit.id) {
      const { error } = await supabase
        .from("produits")
        .update({
          nom: produit.nom,
          description: produit.description ?? null,
          prix: produit.prix,
          unite: produit.unite ?? "piece",
          stock: produit.stock ?? null,
          categorie: produit.categorie ?? null,
          image: produit.image ?? null,
        })
        .eq("id", produit.id)
        .eq("vendeur_id", vendeur.id);
      if (error) return { erreur: error.message };
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
        .eq("vendeur_id", vendeur.id);

      if (countError) return { erreur: countError.message };
      if ((count ?? 0) >= max) {
        return { erreur: `Limite atteinte (${max} produits max). Passez à un abonnement supérieur.` };
      }

      const { error: insertError } = await supabase.from("produits").insert({
        vendeur_id: vendeur.id,
        nom: produit.nom,
        description: produit.description ?? null,
        prix: produit.prix,
        unite: produit.unite ?? "piece",
        stock: produit.stock ?? null,
        categorie: produit.categorie ?? null,
        image: produit.image ?? null,
        statut: "actif",
      });

      if (insertError) return { erreur: insertError.message };
    }

    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function changerStatutProduit(produitId: string, statut: "actif" | "inactif") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return { erreur: "Boutique introuvable." };

    const { error } = await supabase
      .from("produits")
      .update({ statut })
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return { erreur: error.message };
    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function supprimerProduit(produitId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return { erreur: "Boutique introuvable." };

    const { error } = await supabase
      .from("produits")
      .delete()
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return { erreur: error.message };
    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function getMesProduits() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return [];

    const { data } = await supabase
      .from("produits")
      .select("*")
      .eq("vendeur_id", vendeur.id)
      .order("created_at", { ascending: false });

    return data ?? [];
  } catch {
    return [];
  }
}
