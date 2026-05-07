// Webhook Mobile Money — reçoit les notifications PawaPay pour commandes et abonnements.
// Idempotent — peut être rappelé plusieurs fois sans effet secondaire.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, type ProviderId } from "@/lib/payment";
import type { PlanId } from "@/lib/rules";

type Payload = {
  providerRef?: string;
  statut?: "reussi" | "echec" | "en_attente";
  commandeId?: string;
  montantXaf?: number;
  depositId?: string;
  status?: string;
  amount?: string;
  metadata?: Array<{ fieldName: string; fieldValue: string }>;
};

function normaliser(payload: Payload): {
  providerRef: string;
  statut: "reussi" | "echec" | "en_attente";
} | null {
  if (payload.providerRef && payload.statut) {
    return { providerRef: payload.providerRef, statut: payload.statut };
  }
  if (payload.depositId && payload.status) {
    const map: Record<string, "reussi" | "echec" | "en_attente"> = {
      COMPLETED: "reussi", FAILED: "echec", REJECTED: "echec",
      ACCEPTED: "en_attente", SUBMITTED: "en_attente", ENQUEUED: "en_attente",
    };
    return { providerRef: payload.depositId, statut: map[payload.status] ?? "en_attente" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Identifier le provider via l'en-tête signature
  const signaturePawapay = req.headers.get("signature");
  const signatureMock    = req.headers.get("x-mock-signature");
  const providerId: ProviderId = signaturePawapay ? "airtel" : "mock";

  // 2. Vérifier signature HMAC
  const provider = getProvider(providerId);
  const sig = signaturePawapay ?? signatureMock;
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
    return NextResponse.json({ ok: true, deja_traite: true });
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

    return NextResponse.json({ ok: true });
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
  }

  if (paiement.commande_id && norm.statut === "echec") {
    await admin.from("commandes")
      .update({ statut_paiement: "echec" })
      .eq("id", paiement.commande_id);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ webhook: "Brotega Paiements", ok: true });
}
