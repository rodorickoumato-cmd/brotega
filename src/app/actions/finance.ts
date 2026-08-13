"use server";

// Phase 3 — Admin Center : suivi des retraits vendeurs. Le débit du wallet
// est déjà fait au moment de la demande (voir src/app/actions/wallet.ts) ;
// ce module donne à l'admin la visibilité et les actions qui manquaient
// (payer / rejeter avec recrédit automatique).

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";
import type { RetraitRow } from "@/lib/supabase/database.types";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getRetraitsAdmin(): Promise<{
  erreur: string | null;
  retraits: (RetraitRow & { vendeur_nom: string | null })[] | null;
}> {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, retraits: null };

  const admin = createAdminClient();
  const { data: retraits, error } = await admin
    .from("retraits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { erreur: error.message, retraits: null };
  if (!retraits?.length) return { erreur: null, retraits: [] };

  const vendeurIds = [...new Set(retraits.map((r) => r.vendeur_id))];
  const { data: vendeurs } = await admin.from("vendeurs").select("id, nom").in("id", vendeurIds);
  const nomMap = new Map((vendeurs ?? []).map((v) => [v.id, v.nom]));

  return {
    erreur: null,
    retraits: retraits.map((r) => ({ ...r, vendeur_nom: nomMap.get(r.vendeur_id) ?? null })),
  };
}

export async function marquerRetraitPaye(retraitId: string): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };

  const admin = createAdminClient();
  const { data: retrait } = await admin.from("retraits").select("vendeur_id, montant_xaf, statut").eq("id", retraitId).single();
  if (!retrait) return { erreur: "Retrait introuvable.", succes: false };
  if (retrait.statut !== "a_payer") return { erreur: "Ce retrait a déjà été traité.", succes: false };

  const { error } = await admin
    .from("retraits")
    .update({ statut: "paye", paye_par: userId, paye_le: new Date().toISOString() })
    .eq("id", retraitId);
  if (error) return { erreur: error.message, succes: false };

  const { data: vendeur } = await admin.from("vendeurs").select("utilisateur_id").eq("id", retrait.vendeur_id).single();
  if (vendeur?.utilisateur_id) {
    void envoyerPushUtilisateurs([vendeur.utilisateur_id], {
      title: "Retrait envoyé 💸",
      body: `${retrait.montant_xaf.toLocaleString("fr-FR")} XAF ont été envoyés sur votre Mobile Money.`,
      url: "/vendor/wallet",
      tag: "retrait-paye",
    });
  }

  return { erreur: null, succes: true };
}

export async function rejeterRetrait(retraitId: string, motif: string): Promise<{ erreur: string | null; succes: boolean }> {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé", succes: false };
  if (!motif.trim()) return { erreur: "Un motif est requis pour rejeter un retrait.", succes: false };

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("rejeter_retrait", {
    p_retrait_id: retraitId,
    p_admin_id: userId,
    p_motif: motif.trim(),
  });
  if (error) return { erreur: error.message, succes: false };

  const rpcResult = result as { succes: boolean; erreur?: string };
  if (!rpcResult.succes) return { erreur: rpcResult.erreur ?? "Erreur inconnue", succes: false };

  const { data: retrait } = await admin.from("retraits").select("vendeur_id, montant_xaf").eq("id", retraitId).single();
  if (retrait) {
    const { data: vendeur } = await admin.from("vendeurs").select("utilisateur_id").eq("id", retrait.vendeur_id).single();
    if (vendeur?.utilisateur_id) {
      void envoyerPushUtilisateurs([vendeur.utilisateur_id], {
        title: "Retrait rejeté",
        body: `Votre retrait de ${retrait.montant_xaf.toLocaleString("fr-FR")} XAF a été rejeté et recrédité sur votre wallet. Motif : ${motif.trim()}`,
        url: "/vendor/wallet",
        tag: "retrait-rejete",
      });
    }
  }

  return { erreur: null, succes: true };
}
