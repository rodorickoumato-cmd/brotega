"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ProduitInput = {
  id?: string;
  nom: string;
  slug: string;
  description: string;
  prix: number;
  prix_original?: number;
  images: string[];
  categorie: string;
  stock: number;
  unite?: string;
  ville: string;
  est_nouveau?: boolean;
};

export async function sauvegarderProduit(produit: ProduitInput) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non authentifié." };

  // Récupère l'ID du vendeur lié à cet utilisateur
  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .single();

  if (!vendeur) return { erreur: "Aucune boutique trouvée pour ce compte." };

  const payload = {
    vendeur_id: vendeur.id,
    nom: produit.nom,
    slug: produit.slug,
    description: produit.description,
    prix: produit.prix,
    prix_original: produit.prix_original ?? null,
    images: produit.images,
    categorie: produit.categorie,
    stock: produit.stock,
    unite: produit.unite ?? null,
    tags: [],
    ville: produit.ville,
    est_nouveau: produit.est_nouveau ?? true,
    est_vedette: false,
    actif: true,
  };

  if (produit.id) {
    // Modification — vérifie que le produit appartient bien à ce vendeur
    const { error } = await supabase
      .from("produits")
      .update({ ...payload, est_nouveau: false })
      .eq("id", produit.id)
      .eq("vendeur_id", vendeur.id);

    if (error) return { erreur: error.message };
  } else {
    // Ajout
    const { error } = await supabase.from("produits").insert(payload);
    if (error) return { erreur: error.message };
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/catalogue");
  return { succes: true };
}

export async function supprimerProduit(produitId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non authentifié." };

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .single();

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
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .single();

  if (!vendeur) return [];

  const { data } = await supabase
    .from("produits")
    .select("*")
    .eq("vendeur_id", vendeur.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
