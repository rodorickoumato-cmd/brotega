// Webhook Mobile Money — reçoit les callbacks de tous les providers (Singpay, PVIT, Pawapay, Mock).
// Idempotent — peut être rappelé plusieurs fois sans effet secondaire.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, type ProviderId } from "@/lib/payment";
import { envoyerPushUtilisateurs } from "@/lib/push";
import { envoyerEmailConfirmationPaiement, envoyerEmailNouvelleCommandePaiement } from "@/lib/email";
import type { PlanId } from "@/lib/rules";

type Payload = Record<string, unknown>;

function mapStatut(s: string): "reussi" | "echec" | "en_attente" {
  const low = s.toLowerCase();
  if (["success", "successful", "completed", "reussi"].includes(low)) return "reussi";
  if (["failed", "failure", "error", "rejected", "cancelled", "echec"].includes(low)) return "echec";
  return "en_attente";
}

function normaliser(payload: Payload): {
  providerRef: string;
  statut: "reussi" | "echec" | "en_attente";
} | null {
  // Format interne (mock / test direct)
  if (typeof payload["providerRef"] === "string" && typeof payload["statut"] === "string") {
    return { providerRef: payload["providerRef"], statut: mapStatut(payload["statut"]) };
  }
  // Format PVIT callback : { transactionId, merchantReferenceId, status, ... }
  const pvitRef = (payload["transactionId"] ?? payload["reference_id"] ?? payload["transaction_id"] ?? payload["reference"]) as string | undefined;
  if (pvitRef && typeof payload["status"] === "string") {
    return { providerRef: pvitRef, statut: mapStatut(payload["status"]) };
  }
  // Format PawaPay : { depositId, status }
  if (typeof payload["depositId"] === "string" && typeof payload["status"] === "string") {
    return { providerRef: payload["depositId"], statut: mapStatut(payload["status"]) };
  }
  // Format Singpay : { transaction_id, status } ou { id, status }
  const singpayRef = (payload["transaction_id"] ?? payload["id"]) as string | undefined;
  if (singpayRef && typeof payload["status"] === "string") {
    return { providerRef: singpayRef, statut: mapStatut(payload["status"]) };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Récupérer signature selon le provider actif
  const providerEnv  = process.env.PAYMENT_PROVIDER ?? "mock";
  const sigPvit      = req.headers.get("x-pvit-signature") ?? req.headers.get("x-signature");
  const sigPawapay   = req.headers.get("signature");
  const sigSingpay   = req.headers.get("x-singpay-signature") ?? req.headers.get("x-singpay-hmac");
  const sigMock      = req.headers.get("x-mock-signature");

  const providerId: ProviderId =
    providerEnv === "pvit"    ? "airtel" :
    providerEnv === "pawapay" ? "airtel" :
    providerEnv === "singpay" ? "airtel" :
    "mock";

  // 2. Vérifier signature HMAC
  const provider = getProvider(providerId);
  const sig = sigPvit ?? sigPawapay ?? sigSingpay ?? sigMock;
  if (!provider.verifierSignature(rawBody, sig)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 401 });
  }

  // 3. Parser et normaliser
  let payload: Payload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ erreur: "JSON invalide" }, { status: 400 }); }

  const norm = normaliser(payload);
  if (!norm) return NextResponse.json({ erreur: "Format inconnu" }, { status: 400 });

  // 4. Retrouver le paiement par provider_ref
  const admin = createAdminClient();
  const { data: paiement } = await admin
    .from("paiements")
    .select("id, commande_id, abonnement_id, statut, montant_xaf")
    .eq("provider_ref", norm.providerRef)
    .maybeSingle();

  if (!paiement) {
    return NextResponse.json({ erreur: "Paiement introuvable" }, { status: 404 });
  }

  // 5. Idempotence
  if (paiement.statut === "reussi" || paiement.statut === "echec") {
    return NextResponse.json({ responseCode: 200, transactionId: norm.providerRef });
  }

  // 6. Mise à jour statut paiement
  await admin.from("paiements")
    .update({
      statut: norm.statut === "reussi" ? "reussi" : norm.statut === "echec" ? "echec" : "en_attente",
      raw_callback: payload,
    })
    .eq("id", paiement.id);

  // 7a. Paiement d'ABONNEMENT
  if (paiement.abonnement_id) {
    if (norm.statut === "reussi") {
      // Récupère l'abonnement pour avoir vendeur_id et plan
      const { data: abo } = await admin
        .from("abonnements")
        .select("id, vendeur_id, plan")
        .eq("id", paiement.abonnement_id)
        .single();

      if (abo) {
        // Expire les abonnements actifs existants
        await admin
          .from("abonnements")
          .update({ statut: "expire" })
          .eq("vendeur_id", abo.vendeur_id)
          .eq("statut", "actif");

        // Active le nouvel abonnement
        await admin
          .from("abonnements")
          .update({ statut: "actif" })
          .eq("id", abo.id);
      }
    }

    if (norm.statut === "echec") {
      await admin
        .from("abonnements")
        .update({ statut: "annule" })
        .eq("id", paiement.abonnement_id);
    }

    return NextResponse.json({ responseCode: 200, transactionId: norm.providerRef });
  }

  // 7b. Paiement de COMMANDE
  if (paiement.commande_id && norm.statut === "reussi") {
    const { data: commande } = await admin
      .from("commandes")
      .select("id, vendeur_id, total, frais_livraison")
      .eq("id", paiement.commande_id)
      .single();

    if (!commande?.vendeur_id) {
      return NextResponse.json({ erreur: "Commande sans vendeur" }, { status: 500 });
    }

    await admin.from("commandes")
      .update({
        statut: "payee_escrow",
        statut_paiement: "paye",
        paye_at: new Date().toISOString(),
      })
      .eq("id", commande.id);

    const montantEscrow = commande.total - (commande.frais_livraison ?? 0);
    await admin.rpc("crediter_wallet_escrow", {
      p_vendeur_id: commande.vendeur_id,
      p_montant: montantEscrow,
      p_commande_id: commande.id,
      p_paiement_id: paiement.id,
    });

    // Récupère détails pour notifications + emails
    const { data: cmd } = await admin
      .from("commandes")
      .select("utilisateur_id, vendeur_id, code_court, articles, total, mode_paiement")
      .eq("id", commande.id).single();

    if (cmd?.utilisateur_id) {
      // Push acheteur
      void envoyerPushUtilisateurs([cmd.utilisateur_id], {
        title: "Paiement confirmé ✓",
        body: "Votre paiement est reçu. Le vendeur prépare votre commande.",
        url: `/commande/${cmd.code_court}`,
        tag: "paiement-confirme",
      });

      // Email Brevo acheteur — confirmation paiement
      const { data: acheteur } = await admin
        .from("utilisateurs").select("nom, email").eq("id", cmd.utilisateur_id).single();
      if (acheteur?.email) {
        const articles = Array.isArray(cmd.articles)
          ? (cmd.articles as { nom: string; quantite: number; prix_xaf: number }[])
              .map((a) => ({ nom: a.nom, quantite: a.quantite, prix: a.prix_xaf }))
          : [];
        void envoyerEmailConfirmationPaiement({
          to: acheteur.email,
          nom: acheteur.nom ?? "Client",
          codeCourt: cmd.code_court ?? "",
          total: commande.total,
          articles,
          modePaiement: cmd.mode_paiement ?? "mobile_money",
        });
      }
    }

    // Push + email vendeur
    if (cmd?.vendeur_id) {
      const { data: v } = await admin
        .from("vendeurs").select("utilisateur_id, nom").eq("id", cmd.vendeur_id).single();
      if (v?.utilisateur_id) {
        void envoyerPushUtilisateurs([v.utilisateur_id], {
          title: "Nouvelle commande payée 🛍️",
          body: `Commande ${cmd.code_court} — paiement reçu. Préparez la commande.`,
          url: `/vendor/dashboard`,
          tag: "nouvelle-commande",
        });

        const { data: vendeurUser } = await admin.auth.admin.getUserById(v.utilisateur_id);
        if (vendeurUser.user?.email) {
          const articles = Array.isArray(cmd.articles)
            ? (cmd.articles as { nom: string; quantite: number; prix_xaf: number }[])
                .map((a) => ({ nom: a.nom, quantite: a.quantite, prix: a.prix_xaf }))
            : [];
          void envoyerEmailNouvelleCommandePaiement({
            to: vendeurUser.user.email,
            nomVendeur: v.nom ?? "Vendeur",
            codeCourt: cmd.code_court ?? "",
            total: commande.total,
            articles,
          });
        }
      }
    }
  }

  if (paiement.commande_id && norm.statut === "echec") {
    await admin.from("commandes")
      .update({ statut_paiement: "echec" })
      .eq("id", paiement.commande_id);
  }

  return NextResponse.json({ responseCode: 200, transactionId: norm.providerRef });
}

export async function GET() {
  return NextResponse.json({ webhook: "J'adore la Famille Paiements", ok: true });
}
