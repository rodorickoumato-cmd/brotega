// Validation et application des coupons de réduction.
// Toujours revalidé côté serveur au moment de la commande — un résultat côté
// client (aperçu checkout) n'est jamais utilisé pour calculer le total final.

import { createAdminClient } from "@/lib/supabase/admin";
import type { CouponRow } from "@/lib/supabase/database.types";

export type ValidationCoupon =
  | {
      ok: true;
      coupon: { id: string; code: string; type: CouponRow["type"] };
      reductionXaf: number;
      livraisonGratuite: boolean;
    }
  | { ok: false; erreur: string };

export async function validerCoupon(
  codeSaisi: string,
  sousTotalXaf: number,
  fraisLivraisonXaf: number
): Promise<ValidationCoupon> {
  const code = codeSaisi.trim().toUpperCase();
  if (!code) return { ok: false, erreur: "Entrez un code promo." };

  const admin = createAdminClient();
  const { data: coupon, error } = await admin
    .from("coupons")
    .select("id, code, type, valeur, utilisation_max, utilisation_actuelle, montant_min_xaf, actif, expire_le")
    .eq("code", code)
    .maybeSingle();

  if (error || !coupon) return { ok: false, erreur: "Code promo invalide." };
  if (!coupon.actif) return { ok: false, erreur: "Ce code promo n'est plus actif." };
  if (coupon.expire_le && new Date(coupon.expire_le) < new Date()) {
    return { ok: false, erreur: "Ce code promo a expiré." };
  }
  if (coupon.utilisation_max !== null && coupon.utilisation_actuelle >= coupon.utilisation_max) {
    return { ok: false, erreur: "Ce code promo a atteint sa limite d'utilisation." };
  }
  if (sousTotalXaf < coupon.montant_min_xaf) {
    return { ok: false, erreur: `Commande minimum de ${coupon.montant_min_xaf.toLocaleString("fr-FR")} XAF pour ce code.` };
  }

  let reductionXaf = 0;
  let livraisonGratuite = false;
  if (coupon.type === "pourcentage") {
    reductionXaf = Math.round((sousTotalXaf * Math.min(coupon.valeur, 100)) / 100);
  } else if (coupon.type === "montant_fixe") {
    reductionXaf = Math.min(coupon.valeur, sousTotalXaf);
  } else if (coupon.type === "livraison_gratuite") {
    livraisonGratuite = true;
    reductionXaf = fraisLivraisonXaf; // affiché au client ; frais_livraison réel jamais modifié
  }

  return {
    ok: true,
    coupon: { id: coupon.id, code: coupon.code, type: coupon.type },
    reductionXaf,
    livraisonGratuite,
  };
}

// Incrémente le compteur d'usage — appelé une fois la commande créée avec
// succès. Non bloquant : un échec ici ne doit jamais faire échouer la
// commande (cohérent avec le reste du flux, ex. envoi d'emails).
export async function enregistrerUtilisationCoupon(couponId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("incrementer_utilisation_coupon", { p_coupon_id: couponId });
  } catch {
    // silencieux — le compteur d'usage n'est qu'indicatif pour l'admin
  }
}
