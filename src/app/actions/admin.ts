"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PRODUITS_GRATUIT } from "@/lib/rules";
import { getAppConfig } from "@/lib/config";

const SEUIL_STOCK_FAIBLE = 5;

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

  // Récupère l'utilisateur lié à cette boutique
  const { data: vendeur, error: fetchError } = await admin
    .from("vendeurs").select("utilisateur_id").eq("id", vendeurId).single();
  if (fetchError || !vendeur) return { erreur: "Boutique introuvable." };

  const { error } = await admin.from("vendeurs").update({ statut }).eq("id", vendeurId);
  if (error) return { erreur: error.message };

  // Approbation → promouvoir le rôle utilisateur à "vendeur"
  if (statut === "verifie") {
    await admin.from("utilisateurs")
      .update({ role: "vendeur" })
      .eq("id", vendeur.utilisateur_id);
    await admin.auth.admin.updateUserById(vendeur.utilisateur_id, {
      app_metadata: { role: "vendeur" },
    });
  }

  // Suspension → rétrograder à "acheteur" (boutique inactive, rôle révoqué)
  if (statut === "suspendu") {
    await admin.from("utilisateurs")
      .update({ role: "acheteur" })
      .eq("id", vendeur.utilisateur_id);
    await admin.auth.admin.updateUserById(vendeur.utilisateur_id, {
      app_metadata: { role: "acheteur" },
    });
  }

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

// ── Commandes par période (stats analytiques) ──────────────────
export async function getCommandesPeriode(nbJours: number) {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, commandes: null };
  const admin = createAdminClient();

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - nbJours);

  const { data, error } = await admin
    .from("commandes")
    .select("id, total, statut, created_at")
    .gte("created_at", depuis.toISOString())
    .order("created_at", { ascending: true });

  if (error) return { erreur: error.message, commandes: null };
  return { erreur: null, commandes: data };
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

// ── Dashboard enrichi (Phase 1 — visibilité opérationnelle) ─────
// Uniquement des signaux réellement mesurables depuis la base : pas
// de faux statut "🟢" pour des services non instrumentés (SMS,
// WhatsApp, stockage...). Si on ne peut pas le calculer honnêtement,
// on ne l'affiche pas.
export async function getDashboardEnrichi() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, data: null };

  const admin = createAdminClient();
  const maintenant = new Date();
  const debutJour = new Date(maintenant);
  debutJour.setHours(0, 0, 0, 0);
  const il30min = new Date(maintenant.getTime() - 30 * 60 * 1000);

  // Escrow en retard : une commande en_livraison dont l'escrow n'est pas
  // libéré alors que le délai configuré (+ 1h de marge pour laisser le
  // cron 03h tourner) est dépassé signale que le cron n'a pas fait son
  // travail — sans avoir besoin d'une table de logs dédiée.
  const cfg = await getAppConfig();
  const seuilEscrowMs = cfg.jours_auto_liberation_escrow * 24 * 60 * 60 * 1000 + 60 * 60 * 1000;
  const seuilEscrowDate = new Date(maintenant.getTime() - seuilEscrowMs).toISOString();

  const [
    paiementsJourRes, commandesJourRes, clientsJourRes, vendeursJourRes,
    commandesEnAttenteRes, commandesAExpedierRes, commandesLitigeRes,
    vendeursEnAttenteRes, stockFaibleRes, reclamationsOuvertesRes,
    echecsAirtelRes, echecsMoovRes, escrowRetardRes, pvitConfigRes,
    signalementsEnAttenteRes,
  ] = await Promise.all([
    admin.from("paiements").select("montant_xaf").eq("statut", "reussi").gte("created_at", debutJour.toISOString()),
    admin.from("commandes").select("id", { count: "exact", head: true }).gte("created_at", debutJour.toISOString()),
    admin.from("utilisateurs").select("id", { count: "exact", head: true }).gte("created_at", debutJour.toISOString()),
    admin.from("vendeurs").select("id", { count: "exact", head: true }).gte("created_at", debutJour.toISOString()),
    admin.from("commandes").select("id", { count: "exact", head: true }).eq("statut", "en_attente_paiement"),
    admin.from("commandes").select("id", { count: "exact", head: true }).in("statut", ["payee_escrow", "confirmee_vendeur"]),
    admin.from("commandes").select("id", { count: "exact", head: true }).eq("statut", "litige"),
    admin.from("vendeurs").select("id", { count: "exact", head: true }).eq("statut", "en_attente"),
    admin.from("produits").select("id", { count: "exact", head: true }).eq("statut", "actif").lt("stock", SEUIL_STOCK_FAIBLE).not("stock", "is", null),
    admin.from("reclamations").select("id", { count: "exact", head: true }).in("statut", ["ouverte", "en_cours"]),
    admin.from("paiements").select("id", { count: "exact", head: true }).eq("provider", "airtel").eq("statut", "echec").gte("created_at", il30min.toISOString()),
    admin.from("paiements").select("id", { count: "exact", head: true }).eq("provider", "moov").eq("statut", "echec").gte("created_at", il30min.toISOString()),
    admin.from("commandes").select("id", { count: "exact", head: true }).eq("statut", "en_livraison").is("escrow_libere_at", null).lt("updated_at", seuilEscrowDate),
    admin.from("pvit_config").select("operateur, account_code"),
    admin.from("signalements_produits").select("id", { count: "exact", head: true }).eq("statut", "en_attente"),
  ]);

  const caJour = (paiementsJourRes.data ?? []).reduce((s, p) => s + p.montant_xaf, 0);

  return {
    erreur: null,
    data: {
      aujourdhui: {
        caJour,
        commandesJour: commandesJourRes.count ?? 0,
        clientsJour: clientsJourRes.count ?? 0,
        vendeursJour: vendeursJourRes.count ?? 0,
      },
      aTraiter: {
        commandesEnAttente: commandesEnAttenteRes.count ?? 0,
        commandesAExpedier: commandesAExpedierRes.count ?? 0,
        commandesLitige: commandesLitigeRes.count ?? 0,
        vendeursEnAttente: vendeursEnAttenteRes.count ?? 0,
        stockFaible: stockFaibleRes.count ?? 0,
        reclamationsOuvertes: reclamationsOuvertesRes.count ?? 0,
        signalementsProduits: signalementsEnAttenteRes.count ?? 0,
      },
      alertes: {
        echecsAirtel30min: echecsAirtelRes.count ?? 0,
        echecsMoov30min: echecsMoovRes.count ?? 0,
        pvitAirtelConfigure: !!pvitConfigRes.data?.find((c) => c.operateur === "airtel")?.account_code,
        pvitMoovConfigure: !!pvitConfigRes.data?.find((c) => c.operateur === "moov")?.account_code,
        escrowEnRetard: escrowRetardRes.count ?? 0,
      },
    },
  };
}
