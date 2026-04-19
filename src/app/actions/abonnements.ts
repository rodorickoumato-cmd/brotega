"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const DUREES_PLAN: Record<string, number | null> = {
  gratuit: null,
  mensuel: 30,
  trimestriel: 90,
  semestriel: 180,
  annuel: 365,
};

const MAX_PRODUITS: Record<string, number> = {
  gratuit: 3,
  mensuel: 999,
  trimestriel: 999,
  semestriel: 999,
  annuel: 999,
};

const PRIX_PLAN: Record<string, number> = {
  gratuit: 0,
  mensuel: 2000,
  trimestriel: 5000,
  semestriel: 8000,
  annuel: 15000,
};

export async function souscrireAbonnement(planId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Vous devez être connecté." };

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .single();

  if (!vendeur) return { erreur: "Aucune boutique trouvée. Créez d'abord votre boutique." };

  // Expire l'abonnement actif existant
  await supabase
    .from("abonnements")
    .update({ statut: "expire" })
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "actif");

  const dateDebut = new Date();
  const duree = DUREES_PLAN[planId];
  const dateFin = duree
    ? new Date(dateDebut.getTime() + duree * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("abonnements").insert({
    vendeur_id: vendeur.id,
    plan: planId as "gratuit" | "mensuel" | "trimestriel" | "semestriel" | "annuel",
    prix: PRIX_PLAN[planId] ?? 0,
    statut: "actif",
    date_debut: dateDebut.toISOString(),
    date_fin: dateFin,
    max_produits: MAX_PRODUITS[planId] ?? 3,
  });

  if (error) return { erreur: error.message };

  revalidatePath("/vendor/abonnement");
  revalidatePath("/vendor/dashboard");
  return { succes: true };
}

export async function getAbonnementActuel() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id")
    .eq("utilisateur_id", user.id)
    .single();

  if (!vendeur) return null;

  const { data } = await supabase
    .from("abonnements")
    .select("*")
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "actif")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}
