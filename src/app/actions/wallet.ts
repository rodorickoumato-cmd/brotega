"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { vers241 } from "@/lib/phone";
import type { Wallet, WalletTransaction } from "@/lib/supabase/database.types";

const RETRAIT_MIN_XAF = 5000;
const RETRAIT_MAX_PAR_JOUR = 1; // 1 retrait par jour max

// ─── 1. Lecture wallet du vendeur connecté ────────────────────
export async function getMonWallet(): Promise<{
  wallet: Wallet | null;
  vendeurId: string | null;
  erreur?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { wallet: null, vendeurId: null, erreur: "Non connecté" };

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();
  if (!vendeur) return { wallet: null, vendeurId: null, erreur: "Vous n'avez pas de boutique" };

  const { data: wallet } = await supabase
    .from("wallets").select("*").eq("vendeur_id", vendeur.id).maybeSingle();

  // Si le wallet n'existe pas (vendeur pré-trigger), créer un wallet vide via admin
  if (!wallet) {
    const admin = createAdminClient();
    await admin.from("wallets").insert({ vendeur_id: vendeur.id }).select().maybeSingle();
    const { data: nouveau } = await supabase
      .from("wallets").select("*").eq("vendeur_id", vendeur.id).single();
    return { wallet: nouveau, vendeurId: vendeur.id };
  }

  return { wallet, vendeurId: vendeur.id };
}

// ─── 2. Historique des transactions ───────────────────────────
export async function getMesTransactions(limit = 50): Promise<WalletTransaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();
  if (!vendeur) return [];

  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("vendeur_id", vendeur.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

// ─── 3. Demande de retrait vers Mobile Money ──────────────────
export async function demanderRetrait(input: {
  montant_xaf: number;
  telephone: string;
  provider: "airtel" | "moov";
}) {
  // Validations basiques
  if (!Number.isInteger(input.montant_xaf) || input.montant_xaf < RETRAIT_MIN_XAF) {
    return { erreur: `Montant minimum : ${RETRAIT_MIN_XAF.toLocaleString("fr-FR")} XAF` };
  }
  const phone = vers241(input.telephone);
  if (!phone) return { erreur: "Numéro Mobile Money invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" };

  const { data: vendeur } = await supabase
    .from("vendeurs").select("id").eq("utilisateur_id", user.id).maybeSingle();
  if (!vendeur) return { erreur: "Aucune boutique trouvée" };

  // Vérifier le solde disponible
  const { data: wallet } = await supabase
    .from("wallets").select("balance_available_xaf").eq("vendeur_id", vendeur.id).single();
  if (!wallet || wallet.balance_available_xaf < input.montant_xaf) {
    return { erreur: "Solde disponible insuffisant." };
  }

  // Limiter à 1 retrait par jour
  const debut = new Date(); debut.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("vendeur_id", vendeur.id)
    .eq("type", "retrait")
    .gte("created_at", debut.toISOString());

  if ((count ?? 0) >= RETRAIT_MAX_PAR_JOUR) {
    return { erreur: "Limite atteinte : 1 retrait par jour. Réessayez demain." };
  }

  // Débit du wallet + ligne de transaction (via admin pour bypass RLS)
  const admin = createAdminClient();
  const nouveauSolde = wallet.balance_available_xaf - input.montant_xaf;

  const { error: errUpdate } = await admin.from("wallets")
    .update({ balance_available_xaf: nouveauSolde })
    .eq("vendeur_id", vendeur.id);
  if (errUpdate) return { erreur: "Erreur débit wallet : " + errUpdate.message };

  // Récupérer pending pour la trace
  const { data: walletApres } = await admin.from("wallets")
    .select("balance_pending_xaf, balance_available_xaf")
    .eq("vendeur_id", vendeur.id).single();

  await admin.from("wallet_transactions").insert({
    vendeur_id: vendeur.id,
    type: "retrait",
    montant_xaf: -input.montant_xaf,
    solde_pending_apres: walletApres?.balance_pending_xaf ?? 0,
    solde_available_apres: walletApres?.balance_available_xaf ?? nouveauSolde,
    description: `Retrait vers ${input.provider === "airtel" ? "Airtel Money" : "Moov Money"} ${phone}`,
  });

  // TODO : déclencher le payout via provider Mobile Money (API payout Pawapay)
  // Pour l'instant : trace seulement, l'admin J'adore la Famille traitera manuellement.

  return {
    succes: true,
    message: "Retrait demandé. Vous recevrez l'argent sur votre Mobile Money sous 24h.",
  };
}
