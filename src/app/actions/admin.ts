"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, user: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, user: null };
  return { erreur: null, user };
}

// ── Commandes ──────────────────────────────────────────────────
export async function getCommandesAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, commandes: null };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commandes")
    .select("id, code_court, total, statut, statut_paiement, mode_paiement, created_at, utilisateur_id, vendeur_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { erreur: error.message, commandes: null };
  return { erreur: null, commandes: data };
}

// ── Paiements ──────────────────────────────────────────────────
export async function getPaiementsAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, paiements: null };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("paiements")
    .select("id, montant_xaf, provider, statut, telephone, provider_ref, commande_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { erreur: error.message, paiements: null };
  return { erreur: null, paiements: data };
}

// ── Vendeurs ───────────────────────────────────────────────────
export async function getVendeursAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, vendeurs: null };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendeurs")
    .select("id, nom, slug, ville, statut, categories, nb_produits, note, created_at, utilisateur_id")
    .order("created_at", { ascending: false });
  if (error) return { erreur: error.message, vendeurs: null };
  return { erreur: null, vendeurs: data };
}

export async function changerStatutVendeur(vendeurId: string, statut: "verifie" | "suspendu" | "en_attente") {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur };
  const admin = createAdminClient();
  const { error } = await admin
    .from("vendeurs")
    .update({ statut })
    .eq("id", vendeurId);
  if (error) return { erreur: error.message };
  return { succes: true };
}

// ── Stats dashboard ────────────────────────────────────────────
export async function getStatsAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, stats: null };
  const admin = createAdminClient();

  const [cmdRes, vendRes, paiRes] = await Promise.all([
    admin.from("commandes").select("id, total, statut", { count: "exact" }),
    admin.from("vendeurs").select("id, statut", { count: "exact" }),
    admin.from("paiements").select("id, montant_xaf, statut", { count: "exact" }),
  ]);

  const commandes = cmdRes.data ?? [];
  const vendeurs = vendRes.data ?? [];
  const paiements = paiRes.data ?? [];

  const chiffreAffaires = paiements
    .filter((p) => p.statut === "reussi")
    .reduce((s, p) => s + p.montant_xaf, 0);

  return {
    erreur: null,
    stats: {
      totalCommandes: cmdRes.count ?? commandes.length,
      commandesLivrees: commandes.filter((c) => c.statut === "livree").length,
      commandesEnCours: commandes.filter((c) =>
        ["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(c.statut)
      ).length,
      totalVendeurs: vendRes.count ?? vendeurs.length,
      vendeursVerifies: vendeurs.filter((v) => v.statut === "verifie").length,
      vendeursEnAttente: vendeurs.filter((v) => v.statut === "en_attente").length,
      chiffreAffaires,
      paiementsReussis: paiements.filter((p) => p.statut === "reussi").length,
    },
  };
}
