"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUTS_RECLAMATION_OUVRABLE } from "@/lib/rules";
import type { StatutCommande } from "@/lib/rules";

// ─── 1. Acheteur ouvre une réclamation ────────────────────────
export async function ouvrirReclamation(commandeId: string, motif: string) {
  if (!motif.trim() || motif.trim().length < 10)
    return { erreur: "Décrivez le problème (minimum 10 caractères)." };
  if (motif.trim().length > 5000)
    return { erreur: "Description trop longue (maximum 5000 caractères)." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  const { data: commande } = await supabase
    .from("commandes")
    .select("id, statut, utilisateur_id")
    .eq("id", commandeId)
    .single();

  if (!commande || commande.utilisateur_id !== user.id)
    return { erreur: "Commande introuvable" };

  if (!STATUTS_RECLAMATION_OUVRABLE.includes(commande.statut as StatutCommande))
    return { erreur: "Vous ne pouvez pas ouvrir de réclamation pour cette commande." };

  // Vérifier qu'aucune réclamation ouverte n'existe déjà
  const { data: existante } = await supabase
    .from("reclamations")
    .select("id")
    .eq("commande_id", commandeId)
    .in("statut", ["ouverte", "en_cours"])
    .maybeSingle();

  if (existante) return { erreur: "Une réclamation est déjà en cours pour cette commande." };

  const admin = createAdminClient();

  await admin.from("reclamations").insert({
    commande_id: commandeId,
    utilisateur_id: user.id,
    motif: motif.trim(),
    statut: "ouverte",
  });

  // Passe la commande en litige → bloque l'escrow
  await admin.from("commandes").update({ statut: "litige" }).eq("id", commandeId);

  return { succes: true };
}

// ─── 2. Lecture de la réclamation liée à une commande ─────────
export async function getReclamationCommande(commandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("reclamations")
    .select("*")
    .eq("commande_id", commandeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// ─── 3. Admin : liste toutes les réclamations ──────────────────
export async function getReclamationsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return [];

  const { data } = await supabase
    .from("reclamations")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// ─── 4. Admin : résoudre une réclamation ──────────────────────
export async function resoudreReclamation({
  reclamationId,
  resolution,
  faveur,
}: {
  reclamationId: string;
  resolution: string;
  faveur: "acheteur" | "vendeur";
}) {
  if (!resolution.trim() || resolution.trim().length < 5)
    return { erreur: "Saisissez une résolution (min. 5 caractères)." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" };

  const { data: reclamation } = await supabase
    .from("reclamations")
    .select("id, commande_id, statut")
    .eq("id", reclamationId)
    .single();

  if (!reclamation) return { erreur: "Réclamation introuvable" };
  if (!["ouverte", "en_cours"].includes(reclamation.statut))
    return { erreur: "Réclamation déjà résolue." };

  const admin = createAdminClient();
  const statutResolution = faveur === "acheteur" ? "resolue_acheteur" : "resolue_vendeur";
  const statutCommande: StatutCommande = faveur === "acheteur" ? "remboursee" : "livree";

  await admin.from("reclamations").update({
    statut: statutResolution,
    resolution: resolution.trim(),
    admin_id: user.id,
    resolue_at: new Date().toISOString(),
  }).eq("id", reclamationId);

  await admin.from("commandes")
    .update({ statut: statutCommande })
    .eq("id", reclamation.commande_id);

  return { succes: true };
}
