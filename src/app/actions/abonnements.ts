"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { PLANS, type PlanId } from "@/lib/rules";
import { getPrixPlan } from "@/lib/config";
import { getProvider } from "@/lib/payment";
import type { ProviderId } from "@/lib/payment";
import { vers241 } from "@/lib/phone";

// ── Activation directe (appelée par le webhook après paiement confirmé) ───────
export async function activerAbonnement(vendeurId: string, planId: PlanId, abonnementId: string) {
  const admin = createAdminClient();

  // Expire les autres abonnements actifs du vendeur
  await admin
    .from("abonnements")
    .update({ statut: "expire" })
    .eq("vendeur_id", vendeurId)
    .eq("statut", "actif");

  // Active celui-ci
  const { error } = await admin
    .from("abonnements")
    .update({ statut: "actif" })
    .eq("id", abonnementId)
    .eq("vendeur_id", vendeurId);

  return error ? { erreur: error.message } : { succes: true };
}

// ── Plan gratuit — activation directe sans paiement ─────────────────────────
export async function souscrireGratuit() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
  if (!vendeur) return { erreur: "Boutique introuvable." };

  const plan = PLANS.gratuit;

  await supabase
    .from("abonnements")
    .update({ statut: "expire" })
    .eq("vendeur_id", vendeur.id)
    .in("statut", ["actif", "en_attente_paiement"]);

  const { error } = await supabase.from("abonnements").insert({
    vendeur_id: vendeur.id,
    plan: "gratuit",
    prix_xaf: plan.prix_xaf,
    statut: "actif",
    max_produits: plan.max_produits as number,
    date_debut: new Date().toISOString(),
    date_fin: null,
  });

  if (error) return { erreur: error.message };
  revalidatePath("/vendor/abonnement");
  revalidatePath("/vendor/dashboard");
  return { succes: true };
}

// ── Plans payants — initier paiement Mobile Money ────────────────────────────
export async function initierPaiementAbonnement(input: {
  planId: PlanId;
  telephone: string;
  provider: "airtel" | "moov";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };

  const plan = PLANS[input.planId];
  if (!plan || plan.prix_xaf === 0) return { erreur: "Plan invalide pour le paiement." };

  // Prix depuis la configuration dynamique (fallback sur rules.ts si DB inaccessible)
  const prixXaf = await getPrixPlan(input.planId as "mensuel" | "trimestriel" | "semestriel" | "annuel");

  const telephone = vers241(input.telephone);
  if (!telephone) return { erreur: "Numéro invalide. Format : 01 23 45 67" };

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
  if (!vendeur) return { erreur: "Boutique introuvable." };

  // Annule les abonnements en attente de paiement existants
  await supabase
    .from("abonnements")
    .update({ statut: "annule" })
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "en_attente_paiement");

  const dateDebut = new Date();
  const dateFin = plan.duree_jours
    ? new Date(dateDebut.getTime() + plan.duree_jours * 86400000).toISOString()
    : null;

  // Crée l'abonnement en attente de paiement
  const { data: abo, error: aboError } = await supabase
    .from("abonnements")
    .insert({
      vendeur_id: vendeur.id,
      plan: input.planId,
      prix_xaf: prixXaf,
      statut: "en_attente_paiement",
      max_produits: plan.max_produits === Infinity ? 999999 : plan.max_produits,
      date_debut: dateDebut.toISOString(),
      date_fin: dateFin,
    })
    .select("id")
    .single();

  if (aboError || !abo) return { erreur: "Erreur création abonnement." };

  // Crée le paiement lié à cet abonnement
  const idempotencyKey = `abo-${abo.id}`;
  const { data: paiement, error: paiementError } = await supabase
    .from("paiements")
    .insert({
      abonnement_id: abo.id,
      provider: input.provider as ProviderId,
      idempotency_key: idempotencyKey,
      montant_xaf: prixXaf,
      telephone,
      statut: "initie",
    })
    .select("id")
    .single();

  if (paiementError || !paiement) {
    await supabase.from("abonnements").update({ statut: "annule" }).eq("id", abo.id);
    return { erreur: "Erreur création paiement." };
  }

  // Appel PawaPay
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const provider = getProvider(input.provider as ProviderId);
  const result = await provider.initier({
    idempotencyKey,
    montantXaf: prixXaf,
    telephone,
    provider: input.provider as ProviderId,
    commandeCode: `ABO-${input.planId.slice(0, 3).toUpperCase()}`,
    commandeId: paiement.id,
    webhookUrl: `${appUrl}/api/webhooks/paiements`,
  });

  if (!result.ok) {
    await supabase.from("paiements").update({ statut: "echec", message_erreur: result.erreur }).eq("id", paiement.id);
    await supabase.from("abonnements").update({ statut: "annule" }).eq("id", abo.id);
    return { erreur: result.erreur };
  }

  await supabase.from("paiements")
    .update({ provider_ref: result.providerRef, statut: "en_attente" })
    .eq("id", paiement.id);

  return {
    succes: true,
    paiementId: paiement.id,
    instructions: result.instructions,
  };
}

// ── Vérifier le statut d'un paiement d'abonnement (polling UI) ───────────────
export async function verifierStatutPaiementAbonnement(paiementId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paiements")
    .select("statut")
    .eq("id", paiementId)
    .single();
  return { statut: data?.statut ?? "introuvable" };
}

// ── Lire l'abonnement actif ───────────────────────────────────────────────────
export async function getAbonnementActuel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
  if (!vendeur) return null;

  const { data } = await supabase
    .from("abonnements")
    .select("*")
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "actif")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
