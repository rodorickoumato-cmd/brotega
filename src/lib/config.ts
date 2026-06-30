import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLANS,
  MAX_PRODUITS_GRATUIT,
  TAUX_COMMISSION,
  FRAIS_MOBILE_MONEY_TAUX,
  AIRTEL_MONEY_ACTIF,
  MOOV_MONEY_ACTIF,
  JOURS_AUTO_LIBERATION_ESCROW,
  RETRAIT_MIN_XAF,
  MAX_RETRAITS_PAR_JOUR,
} from "@/lib/rules";

export type PlansPrix = {
  mensuel: number;
  trimestriel: number;
  semestriel: number;
  annuel: number;
};

export type AppConfig = {
  plans_prix: PlansPrix;
  max_produits_gratuit: number;
  taux_commission: number;
  frais_mobile_money_taux: number;
  airtel_money_actif: boolean;
  moov_money_actif: boolean;
  jours_auto_liberation_escrow: number;
  retrait_min_xaf: number;
  max_retraits_par_jour: number;
};

// Valeurs de fallback = constantes de rules.ts — jamais de crash si la DB est inaccessible
const DEFAUTS: AppConfig = {
  plans_prix: {
    mensuel:     PLANS.mensuel.prix_xaf,
    trimestriel: PLANS.trimestriel.prix_xaf,
    semestriel:  PLANS.semestriel.prix_xaf,
    annuel:      PLANS.annuel.prix_xaf,
  },
  max_produits_gratuit:         MAX_PRODUITS_GRATUIT,
  taux_commission:              TAUX_COMMISSION,
  frais_mobile_money_taux:      FRAIS_MOBILE_MONEY_TAUX,
  airtel_money_actif:           AIRTEL_MONEY_ACTIF,
  moov_money_actif:             MOOV_MONEY_ACTIF,
  jours_auto_liberation_escrow: JOURS_AUTO_LIBERATION_ESCROW,
  retrait_min_xaf:              RETRAIT_MIN_XAF,
  max_retraits_par_jour:        MAX_RETRAITS_PAR_JOUR,
};

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("app_config").select("cle, valeur");
    if (error || !data?.length) return DEFAUTS;

    const cfg: Record<string, unknown> = { ...DEFAUTS };
    for (const row of data) {
      cfg[row.cle] = row.valeur;
    }
    return cfg as unknown as AppConfig;
  } catch {
    return DEFAUTS;
  }
}

export async function getPrixPlan(planId: "mensuel" | "trimestriel" | "semestriel" | "annuel"): Promise<number> {
  const cfg = await getAppConfig();
  return cfg.plans_prix[planId];
}
