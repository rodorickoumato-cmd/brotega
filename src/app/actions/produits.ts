"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
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
    // Mise à jour : pas de vérification de limite
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
    // Création : vérifie la limite via RPC atomique (advisory lock + count réel)
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
    const admin = createAdminClient();

    const { data: result, error: errRpc } = await admin.rpc("inserer_produit_si_limite_ok", {
      p_vendeur_id: vendeur.id,
      p_max: max,
      p_nom: produit.nom,
      p_description: produit.description ?? null,
      p_prix: produit.prix,
      p_categorie: produit.categorie ?? null,
      p_image: produit.image ?? null,
      p_unite: produit.unite ?? "piece",
      p_stock: produit.stock ?? null,
    });

    if (errRpc) return { erreur: errRpc.message };
    const rpcResult = result as { succes: boolean; erreur?: string };
    if (!rpcResult.succes) return { erreur: rpcResult.erreur ?? "Limite atteinte." };
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
