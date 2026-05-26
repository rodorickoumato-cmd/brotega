"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PRODUITS_GRATUIT } from "@/lib/rules";

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

// ── Vendeurs avec abonnement ────────────────────────────────────
export async function getVendeursAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, vendeurs: null };
  const admin = createAdminClient();

  const [vendeursRes, abonnementsRes] = await Promise.all([
    admin.from("vendeurs")
      .select("id, nom, slug, ville, statut, categories, nb_produits, note, created_at, utilisateur_id")
      .order("created_at", { ascending: false }),
    admin.from("abonnements")
      .select("vendeur_id, plan, statut, date_fin, prix_xaf")
      .in("statut", ["actif", "expire"])
      .order("created_at", { ascending: false }),
  ]);

  if (vendeursRes.error) return { erreur: vendeursRes.error.message, vendeurs: null };

  // Attache l'abonnement le plus récent à chaque vendeur
  const aboParVendeur = new Map<string, typeof abonnementsRes.data extends (infer T)[] | null ? T : never>();
  for (const abo of abonnementsRes.data ?? []) {
    if (!aboParVendeur.has(abo.vendeur_id)) {
      aboParVendeur.set(abo.vendeur_id, abo);
    }
  }

  const vendeurs = (vendeursRes.data ?? []).map((v) => ({
    ...v,
    abonnement: aboParVendeur.get(v.id) ?? null,
  }));

  return { erreur: null, vendeurs };
}

// ── Valider / Suspendre / Réactiver ────────────────────────────
export async function changerStatutVendeur(vendeurId: string, statut: "verifie" | "suspendu" | "en_attente") {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur };
  const admin = createAdminClient();
  const { error } = await admin.from("vendeurs").update({ statut }).eq("id", vendeurId);
  if (error) return { erreur: error.message };
  return { succes: true };
}

// ── Expirer les abonnements dépassés + masquer les produits en excès ──
// À appeler manuellement depuis le dashboard admin ou via cron Supabase
export async function traiterAbonnementsExpires() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, nb: 0 };

  const admin = createAdminClient();
  const maintenant = new Date().toISOString();

  // 1. Trouver les abonnements payants dont la date_fin est dépassée
  const { data: aboExpires } = await admin
    .from("abonnements")
    .select("id, vendeur_id, plan")
    .eq("statut", "actif")
    .neq("plan", "gratuit")
    .lt("date_fin", maintenant);

  if (!aboExpires?.length) return { succes: true, nb: 0 };

  const vendeurIds = [...new Set(aboExpires.map((a) => a.vendeur_id))];

  // 2. Marquer les abonnements comme expirés
  await admin.from("abonnements")
    .update({ statut: "expire" })
    .in("id", aboExpires.map((a) => a.id));

  // 3. Pour chaque vendeur, masquer les produits au-delà de la limite gratuite
  for (const vendeurId of vendeurIds) {
    const { data: produits } = await admin
      .from("produits")
      .select("id")
      .eq("vendeur_id", vendeurId)
      .eq("statut", "actif")
      .order("created_at", { ascending: true });  // les plus anciens restent visibles

    if (produits && produits.length > MAX_PRODUITS_GRATUIT) {
      const aDesactiver = produits.slice(MAX_PRODUITS_GRATUIT).map((p) => p.id);
      await admin.from("produits")
        .update({ statut: "inactif" })
        .in("id", aDesactiver);
    }
  }

  // 4. Suspendre ces vendeurs (abonnement expiré = boutique en pause)
  await admin.from("vendeurs")
    .update({ statut: "suspendu" })
    .in("id", vendeurIds)
    .eq("statut", "verifie");

  return { succes: true, nb: vendeurIds.length };
}

// ── Stats dashboard ────────────────────────────────────────────
export async function getStatsAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, stats: null };
  const admin = createAdminClient();

  const [cmdRes, vendRes, paiRes, aboExpiresRes] = await Promise.all([
    admin.from("commandes").select("id, total, statut", { count: "exact" }),
    admin.from("vendeurs").select("id, statut", { count: "exact" }),
    admin.from("paiements").select("id, montant_xaf, statut", { count: "exact" }),
    admin.from("abonnements")
      .select("id", { count: "exact", head: true })
      .eq("statut", "actif")
      .neq("plan", "gratuit")
      .lt("date_fin", new Date().toISOString()),
  ]);

  const commandes = cmdRes.data ?? [];
  const vendeurs  = vendRes.data ?? [];
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
      abonnementsExpires: aboExpiresRes.count ?? 0,
    },
  };
}
