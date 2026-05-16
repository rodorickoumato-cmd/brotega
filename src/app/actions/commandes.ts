"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererCodeCommande } from "@/lib/orderCode";
import { getProvider } from "@/lib/payment";
import type { ProviderId } from "@/lib/payment";
import { vers241 } from "@/lib/phone";
import { headers } from "next/headers";
import { envoyerEmailConfirmationCommande, envoyerEmailNouvelleCommande } from "@/lib/email";

const COMMISSION_RATE = 0.05;
const FRAIS_LIVRAISON_DEFAUT = 2500;

export type ItemPanier = {
  produit_id: string;
  nom: string;
  prix_xaf: number;
  quantite: number;
  image: string | null;
  vendeur_id: string;
};

export type AdresseLivraison = {
  nom_complet: string;
  telephone: string;       // E.164
  ville: string;
  quartier?: string;
  details?: string;
};

export type ModePaiement = "airtel_money" | "moov_money" | "especes";

function modeVersProvider(mode: ModePaiement): ProviderId {
  if (mode === "airtel_money") return "airtel";
  if (mode === "moov_money") return "moov";
  return "cash";
}

async function urlWebhookAbsolue(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
  return `${base}/api/webhooks/paiements`;
}

// ─── Email helper (best-effort) ───────────────────────────────
async function envoyerEmailsCommande(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  params: {
    commandeId: string;
    codeCourt: string;
    total: number;
    items: ItemPanier[];
    modePaiement: string;
    acheteurId: string;
    acheteurEmail: string | null;
    vendeurId: string;
  }
) {
  try {
    const articles = params.items.map((i) => ({ nom: i.nom, quantite: i.quantite, prix: i.prix_xaf }));

    // Email acheteur
    if (params.acheteurEmail) {
      const { data: acheteur } = await admin.from("utilisateurs").select("nom").eq("id", params.acheteurId).single();
      await envoyerEmailConfirmationCommande({
        to: params.acheteurEmail,
        nom: acheteur?.nom ?? "Client",
        codeCourt: params.codeCourt,
        total: params.total,
        articles,
        modePaiement: params.modePaiement,
      });
    }

    // Email vendeur
    const { data: vendeur } = await admin.from("vendeurs").select("nom, utilisateur_id").eq("id", params.vendeurId).single();
    if (vendeur?.utilisateur_id) {
      const { data: { user: vendeurUser } } = await admin.auth.admin.getUserById(vendeur.utilisateur_id);
      if (vendeurUser?.email) {
        await envoyerEmailNouvelleCommande({
          to: vendeurUser.email,
          nomVendeur: vendeur.nom,
          codeCourt: params.codeCourt,
          total: params.total,
          articles,
        });
      }
    }
  } catch {
    // Never crash the order flow
  }
}

// ─── 1. Créer commande + initier paiement ─────────────────────
export async function creerCommande(input: {
  items: ItemPanier[];
  adresse: AdresseLivraison;
  mode_paiement: ModePaiement;
  telephone_paiement?: string;  // pour Mobile Money — peut différer de l'adresse
}) {
  if (input.items.length === 0) return { erreur: "Panier vide." };

  // 1. Vérification utilisateur (RLS exige auth.uid)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Vous devez être connecté pour commander." };

  // 2. Tous les articles doivent venir d'un seul vendeur (MVP simple)
  const vendeurIds = [...new Set(input.items.map((i) => i.vendeur_id))];
  if (vendeurIds.length > 1) {
    return { erreur: "Vous ne pouvez commander qu'auprès d'un seul vendeur à la fois." };
  }
  const vendeurId = vendeurIds[0];

  // 3. Calcul total côté serveur (jamais confiance au client)
  const sousTotal = input.items.reduce((s, it) => s + it.prix_xaf * it.quantite, 0);
  const fraisLivraison = FRAIS_LIVRAISON_DEFAUT;
  const total = sousTotal + fraisLivraison;
  const commission = Math.round(sousTotal * COMMISSION_RATE);

  // 4. Validation téléphone Mobile Money si applicable
  const isMM = input.mode_paiement === "airtel_money" || input.mode_paiement === "moov_money";
  let phoneMM: string | null = null;
  if (isMM) {
    phoneMM = vers241(input.telephone_paiement ?? input.adresse.telephone);
    if (!phoneMM) return { erreur: "Numéro Mobile Money invalide." };
  }

  // 5. Génération code commande unique (3 tentatives)
  const admin = createAdminClient();
  let code: string | null = null;
  for (let i = 0; i < 3; i++) {
    const candidat = genererCodeCommande();
    const { data: existant } = await admin.from("commandes")
      .select("id").eq("code_court", candidat).maybeSingle();
    if (!existant) { code = candidat; break; }
  }
  if (!code) return { erreur: "Erreur génération code commande. Réessayez." };

  // 6. Insertion commande (statut initial : en_attente_paiement)
  const { data: commande, error: errInsert } = await admin
    .from("commandes")
    .insert({
      code_court: code,
      utilisateur_id: user.id,
      vendeur_id: vendeurId,
      articles: input.items,
      total,
      frais_livraison: fraisLivraison,
      commission_xaf: commission,
      mode_paiement: input.mode_paiement,
      telephone_paiement: phoneMM,
      adresse: input.adresse,
      statut: "en_attente_paiement",
      statut_paiement: "en_attente",
    })
    .select("id, code_court")
    .single();

  if (errInsert || !commande) {
    return { erreur: "Erreur création commande : " + (errInsert?.message ?? "inconnue") };
  }

  // Emails de confirmation (best-effort, non bloquant)
  void envoyerEmailsCommande(admin, {
    commandeId: commande.id,
    codeCourt: commande.code_court!,
    total,
    items: input.items,
    modePaiement: input.mode_paiement,
    acheteurId: user.id,
    acheteurEmail: user.email ?? null,
    vendeurId: vendeurId,
  });

  // 7. Cas espèces : commande créée, paiement à la livraison — pas d'appel provider
  if (input.mode_paiement === "especes") {
    return { succes: true, code: commande.code_court!, instructions: "Paiement à la livraison" };
  }

  // 8. Initier paiement Mobile Money
  const providerId = modeVersProvider(input.mode_paiement);
  const provider = getProvider(providerId);
  const idempotencyKey = `cmd-${commande.id}-${Date.now()}`;
  const webhookUrl = await urlWebhookAbsolue();

  // Créer la ligne paiement AVANT l'appel provider (idempotency)
  const { data: paiement, error: errPaiement } = await admin
    .from("paiements")
    .insert({
      commande_id: commande.id,
      provider: providerId,
      idempotency_key: idempotencyKey,
      montant_xaf: total,
      telephone: phoneMM,
      statut: "initie",
    })
    .select("id")
    .single();

  if (errPaiement || !paiement) {
    return { erreur: "Erreur création paiement : " + (errPaiement?.message ?? "inconnue") };
  }

  // Appel provider
  const res = await provider.initier({
    idempotencyKey,
    montantXaf: total,
    telephone: phoneMM!,
    provider: providerId,
    commandeCode: commande.code_court!,
    commandeId: commande.id,
    webhookUrl,
  });

  if (!res.ok) {
    await admin.from("paiements")
      .update({ statut: "echec", message_erreur: res.erreur })
      .eq("id", paiement.id);
    return { erreur: "Échec initiation paiement : " + res.erreur };
  }

  await admin.from("paiements")
    .update({
      provider_ref: res.providerRef,
      statut: res.statut === "reussi" ? "reussi" : "en_attente",
    })
    .eq("id", paiement.id);

  return {
    succes: true,
    code: commande.code_court!,
    instructions: res.instructions ?? "Validez le paiement sur votre téléphone",
  };
}

// ─── 2. Lecture publique d'une commande par code court ────────
export async function getCommandeParCode(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commandes")
    .select("*")
    .eq("code_court", code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ─── 3. Vendeur confirme la commande → crée livraison ─────────
export async function confirmerCommandeVendeur(commandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();
  if (!vendeur) return { erreur: "Vous n'êtes pas vendeur" };

  const { data: commande } = await supabase
    .from("commandes").select("id, statut, vendeur_id").eq("id", commandeId).single();

  if (!commande || commande.vendeur_id !== vendeur.id) return { erreur: "Commande introuvable" };
  if (commande.statut !== "payee_escrow") return { erreur: "Cette commande ne peut pas être confirmée." };

  const admin = createAdminClient();
  await admin.from("commandes").update({ statut: "confirmee_vendeur" }).eq("id", commandeId);
  await admin.from("livraisons").insert({ commande_id: commandeId, statut: "en_attente" });

  return { succes: true };
}

// ─── 4. Admin assigne un livreur ───────────────────────────────
export async function assignerLivreur(livraisonId: string, livreurId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" };

  const admin = createAdminClient();
  const { data: livraison } = await admin
    .from("livraisons").select("id, commande_id").eq("id", livraisonId).single();
  if (!livraison) return { erreur: "Livraison introuvable" };

  await admin.from("livraisons")
    .update({ livreur_id: livreurId, statut: "assignee", assignee_at: new Date().toISOString() })
    .eq("id", livraisonId);
  await admin.from("commandes")
    .update({ statut: "en_livraison", livreur_id: livreurId })
    .eq("id", livraison.commande_id);

  return { succes: true };
}

// ─── 5. Acheteur confirme la livraison → libère escrow ────────
export async function confirmerLivraison(commandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  // Vérifier propriété (RLS aurait suffi mais on double-check)
  const { data: commande } = await supabase
    .from("commandes")
    .select("id, vendeur_id, total, frais_livraison, commission_xaf, statut, utilisateur_id")
    .eq("id", commandeId)
    .single();

  if (!commande || commande.utilisateur_id !== user.id) {
    return { erreur: "Commande introuvable" };
  }

  if (!["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(commande.statut)) {
    return { erreur: "Cette commande ne peut pas encore être confirmée." };
  }

  const admin = createAdminClient();

  // 1. Mettre la commande en livrée
  await admin.from("commandes")
    .update({
      statut: "livree",
      livree_at: new Date().toISOString(),
      escrow_libere_at: new Date().toISOString(),
    })
    .eq("id", commandeId);

  // 2. Libérer escrow (RPC atomique)
  const montantEscrow = commande.total - commande.frais_livraison;
  await admin.rpc("liberer_escrow", {
    p_vendeur_id: commande.vendeur_id!,
    p_montant: montantEscrow,
    p_commission: commande.commission_xaf,
    p_commande_id: commande.id,
  });

  return { succes: true };
}
