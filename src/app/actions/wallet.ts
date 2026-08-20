"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { vers241 } from "@/lib/phone";
import type { Wallet, WalletTransaction } from "@/lib/supabase/database.types";

const RETRAIT_MIN_XAF = 5000;

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

  // Débit atomique : vérification solde + limite journalière + débit + trace en une seule transaction DB
  const admin = createAdminClient();
  const description = `Retrait vers ${input.provider === "airtel" ? "Airtel Money" : "Moov Money"} ${phone}`;

  const { data: result, error: errRpc } = await admin.rpc("debiter_wallet_retrait", {
    p_vendeur_id: vendeur.id,
    p_montant: input.montant_xaf,
    p_description: description,
    p_telephone: phone,
    p_provider: input.provider,
  });

  if (errRpc) return { erreur: "Erreur technique : " + errRpc.message };

  const rpcResult = result as { succes: boolean; erreur?: string };
  if (!rpcResult.succes) return { erreur: rpcResult.erreur ?? "Erreur inconnue" };

  // Le retrait est maintenant tracé dans `retraits` (statut a_payer) —
  // visible et actionnable depuis /admin/retraits. Le virement Mobile Money
  // reste manuel (TODO : brancher un vrai payout via Singpay plus tard).

  return {
    succes: true,
    message: "Retrait demandé. Vous recevrez l'argent sur votre Mobile Money sous 24h.",
  };
}
