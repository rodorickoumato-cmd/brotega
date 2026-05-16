"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MAX_PRODUITS_GRATUIT } from "@/lib/rules";

type ProduitInput = {
  id?: string;
  nom: string;
  description?: string | null;
  prix: number;
  categorie?: string | null;
  image?: string | null;
};

export async function sauvegarderProduit(produit: ProduitInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non authentifié." };

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id, nb_produits")
    .eq("utilisateur_id", user.id)
    .single();
  if (!vendeur) return { erreur: "Aucune boutique trouvée." };

  // Vérifie la limite du plan gratuit (uniquement à la création)
  if (!produit.id) {
    const { data: abo } = await supabase
      .from("abonnements")
      .select("max_produits")
      .eq("vendeur_id", vendeur.id)
      .eq("statut", "actif")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const max = abo?.max_produits ?? MAX_PRODUITS_GRATUIT;
    if (vendeur.nb_produits >= max) {
      return { erreur: `Limite atteinte (${max} produits). Passez à un plan supérieur.` };
    }
  }

  const payload = {
    vendeur_id: vendeur.id,
    nom: produit.nom,
    description: produit.description ?? null,
    prix: produit.prix,
    categorie: produit.categorie ?? null,
    image: produit.image ?? null,
  };

  if (produit.id) {
    const { error } = await supabase
      .from("produits")
      .update(payload)
      .eq("id", produit.id)
      .eq("vendeur_id", vendeur.id);
    if (error) return { erreur: error.message };
  } else {
    const { error } = await supabase.from("produits").insert(payload);
    if (error) return { erreur: error.message };
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/catalogue");
  return { succes: true };
}

export async function changerStatutProduit(produitId: string, statut: "actif" | "inactif") {
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
  revalidatePath("/vendor/dashboard");
  return { succes: true };
}

export async function supprimerProduit(produitId: string) {
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
  revalidatePath("/vendor/dashboard");
  revalidatePath("/catalogue");
  return { succes: true };
}

export async function getMesProduits() {
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
}
