// ─── RÈGLES BUSINESS J'ADORE LA FAMILLE V1 ───────────────────────────────
// Ce fichier est la loi interne. Toute logique métier s'appuie ici.
// Ne jamais hardcoder ces valeurs ailleurs dans le code.

// ─── ABONNEMENTS ──────────────────────────────────────────────

export const PLANS = {
  gratuit:      { label: "Découverte",           prix_xaf: 0,      max_produits: 3,         duree_jours: null },
  mensuel:      { label: "Business Mensuel",     prix_xaf: 2_000,  max_produits: Infinity,  duree_jours: 30   },
  trimestriel:  { label: "Business Trimestriel", prix_xaf: 5_000,  max_produits: Infinity,  duree_jours: 90   },
  semestriel:   { label: "Business Semestriel",  prix_xaf: 8_000,  max_produits: Infinity,  duree_jours: 180  },
  annuel:       { label: "Business Annuel",      prix_xaf: 15_000, max_produits: Infinity,  duree_jours: 365  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_DEFAUT: PlanId = "gratuit";

// ─── PRODUITS ─────────────────────────────────────────────────

export const MAX_PRODUITS_GRATUIT = 3;

export function peutAjouterProduit(nbActuels: number, maxPlan: number): boolean {
  return nbActuels < maxPlan;
}

// ─── VENDEUR ──────────────────────────────────────────────────

export const STATUTS_VENDEUR = ["en_attente", "verifie", "suspendu"] as const;
export type StatutVendeur = typeof STATUTS_VENDEUR[number];
export const MAX_BOUTIQUES_PAR_UTILISATEUR = 1;

// ─── COMMANDES ────────────────────────────────────────────────

export const MAX_VENDEURS_PAR_COMMANDE = 1;
export const TAUX_COMMISSION = 0;

export const STATUTS_COMMANDE = [
  "en_attente_paiement",
  "payee_escrow",
  "confirmee_vendeur",
  "en_livraison",
  "livree",
  "litige",
  "remboursee",
  "annulee",
] as const;
export type StatutCommande = typeof STATUTS_COMMANDE[number];

// ─── LIVRAISON — PROVINCES DU GABON ───────────────────────────

export type ProvinceCode = "EST" | "OMA" | "MOY" | "WNT" | "OIV" | "OLO" | "HAO" | "NGO" | "NYA";

export const PROVINCES_INFO: Record<ProvinceCode, { label: string; chef: string }> = {
  EST: { label: "Estuaire",         chef: "Libreville"   },
  OMA: { label: "Ogooué-Maritime",  chef: "Port-Gentil"  },
  MOY: { label: "Moyen-Ogooué",     chef: "Lambaréné"    },
  WNT: { label: "Woleu-Ntem",       chef: "Oyem"         },
  OIV: { label: "Ogooué-Ivindo",    chef: "Makokou"      },
  OLO: { label: "Ogooué-Lolo",      chef: "Koulamoutou"  },
  HAO: { label: "Haut-Ogooué",      chef: "Franceville"  },
  NGO: { label: "Ngounié",          chef: "Mouila"       },
  NYA: { label: "Nyanga",           chef: "Tchibanga"    },
};

// Mapping ville → province
export const VILLE_PROVINCE: Record<string, ProvinceCode> = {
  // ── Estuaire ──────────────────────────────────────────────
  "Libreville": "EST", "Owendo": "EST", "Akanda": "EST",
  "Ntoum":      "EST", "Kango":  "EST", "Cocobeach": "EST",
  // ── Ogooué-Maritime ───────────────────────────────────────
  "Port-Gentil": "OMA", "Omboué": "OMA", "Ntounga": "OMA", "Gamba": "OMA",
  // ── Moyen-Ogooué ──────────────────────────────────────────
  "Lambaréné": "MOY", "Bifoun": "MOY", "Ndjolé": "MOY", "Sindara": "MOY", "Malinga": "MOY",
  // ── Woleu-Ntem ────────────────────────────────────────────
  "Oyem": "WNT", "Bitam": "WNT", "Mitzic": "WNT", "Médouneu": "WNT", "Aboumi": "WNT", "Minvoul": "WNT",
  // ── Ogooué-Ivindo ─────────────────────────────────────────
  "Booué": "OIV", "Lopé": "OIV", "Ovan": "OIV", "Makokou": "OIV", "Mékambo": "OIV",
  // ── Ogooué-Lolo ───────────────────────────────────────────
  "Lastoursville": "OLO", "Koulamoutou": "OLO", "Pana": "OLO", "Lebombi": "OLO",
  // ── Haut-Ogooué ───────────────────────────────────────────
  "Franceville": "HAO", "Moanda": "HAO", "Bongoville": "HAO", "Mounana": "HAO",
  "Bakoumba": "HAO", "Lekoni": "HAO", "Okondja": "HAO", "Akiéni": "HAO",
  // ── Ngounié ───────────────────────────────────────────────
  "Fougamou": "NGO", "Mandji": "NGO", "Mouila":   "NGO", "Lebamba": "NGO",
  "Mimongo":  "NGO", "Ndendé": "NGO", "Mbigou":   "NGO",
  // ── Nyanga ────────────────────────────────────────────────
  "Moabi": "NYA", "Tchibanga": "NYA", "Mayumba": "NYA", "Mabanda": "NYA", "Ndindi": "NYA",
};

// ─── MATRICE TARIFS INTER-PROVINCES (FCFA) ────────────────────
// Basée sur les routes réelles et distances entre chefs-lieux
// Ligne = province vendeur, Colonne = province acheteur
// Valeurs symétriques (A→B = B→A)

const T: Record<ProvinceCode, Record<ProvinceCode, number>> = {
  //        EST    OMA    MOY    WNT    OIV    OLO    HAO    NGO    NYA
  EST: { EST:2000, OMA:4500, MOY:2500, WNT:3500, OIV:4000, OLO:5000, HAO:5000, NGO:4000, NYA:6000 },
  OMA: { EST:4500, OMA:2000, MOY:3500, WNT:6000, OIV:6500, OLO:5500, HAO:6500, NGO:4000, NYA:4500 },
  MOY: { EST:2500, OMA:3500, MOY:2000, WNT:4000, OIV:3500, OLO:3000, HAO:4500, NGO:2500, NYA:5000 },
  WNT: { EST:3500, OMA:6000, MOY:4000, WNT:2000, OIV:3000, OLO:5000, HAO:5500, NGO:5000, NYA:6500 },
  OIV: { EST:4000, OMA:6500, MOY:3500, WNT:3000, OIV:2000, OLO:3000, HAO:3500, NGO:4500, NYA:6000 },
  OLO: { EST:5000, OMA:5500, MOY:3000, WNT:5000, OIV:3000, OLO:2000, HAO:2500, NGO:3000, NYA:4500 },
  HAO: { EST:5000, OMA:6500, MOY:4500, WNT:5500, OIV:3500, OLO:2500, HAO:2000, NGO:4000, NYA:5000 },
  NGO: { EST:4000, OMA:4000, MOY:2500, WNT:5000, OIV:4500, OLO:3000, HAO:4000, NGO:2000, NYA:2500 },
  NYA: { EST:6000, OMA:4500, MOY:5000, WNT:6500, OIV:6000, OLO:4500, HAO:5000, NGO:2500, NYA:2000 },
};

// Tarif extra pour les villes excentrées dans leur province (km supplémentaires)
const SUPPLEMENT_VILLE: Record<string, number> = {
  "Cocobeach": 1500, "Kango": 500, "Ntoum": 0,
  "Gamba": 2000, "Ntounga": 1500, "Omboué": 1000,
  "Malinga": 1500, "Ndjolé": 500, "Sindara": 500,
  "Minvoul": 1500, "Médouneu": 1000, "Aboumi": 1000,
  "Mékambo": 2000, "Ovan": 1000,
  "Lebombi": 1000, "Pana": 500,
  "Bakoumba": 1500, "Lekoni": 2000, "Akiéni": 1000, "Okondja": 1500,
  "Mbigou": 1500, "Mimongo": 1000, "Ndendé": 500, "Lebamba": 500,
  "Mayumba": 1500, "Ndindi": 1000, "Mabanda": 500,
};

/**
 * Calcule les frais de livraison selon la province du vendeur et celle de l'acheteur.
 * @param villeVendeur  Ville où se trouve le vendeur
 * @param villeAcheteur Ville de livraison choisie par l'acheteur
 */
export function fraisLivraison(villeVendeur: string, villeAcheteur: string): number {
  // Même ville exacte → tarif local fixe
  if (villeVendeur === villeAcheteur) return 1_500;

  const pV = VILLE_PROVINCE[villeVendeur] ?? "EST"; // défaut : Libreville
  const pA = VILLE_PROVINCE[villeAcheteur] ?? "EST";

  const base = T[pV][pA];
  const supp = SUPPLEMENT_VILLE[villeAcheteur] ?? 0;

  return base + supp;
}

/**
 * Retourne un libellé clair du trajet de livraison.
 */
export function libelleTrajetLivraison(villeVendeur: string, villeAcheteur: string): {
  zone: "locale" | "intra" | "inter";
  label: string;
} {
  if (villeVendeur === villeAcheteur) {
    return { zone: "locale", label: `Livraison locale — ${villeVendeur}` };
  }
  const pV = VILLE_PROVINCE[villeVendeur] ?? "EST";
  const pA = VILLE_PROVINCE[villeAcheteur] ?? "EST";
  const lV = PROVINCES_INFO[pV].label;
  const lA = PROVINCES_INFO[pA].label;
  if (pV === pA) {
    return { zone: "intra", label: `Intra-province — ${lV}` };
  }
  return { zone: "inter", label: `${lV} → ${lA}` };
}

// ─── ESCROW / WALLET ──────────────────────────────────────────

export const JOURS_AUTO_LIBERATION_ESCROW = 7;
export const RETRAIT_MIN_XAF = 5_000;
export const MAX_RETRAITS_PAR_JOUR = 1;

// ─── RÉCLAMATIONS ─────────────────────────────────────────────

export const STATUTS_RECLAMATION_OUVRABLE: StatutCommande[] = [
  "payee_escrow",
  "confirmee_vendeur",
  "en_livraison",
  "livree",
];

// ─── MODES DE PAIEMENT ────────────────────────────────────────

export const AIRTEL_MONEY_ACTIF = true;
export const MOOV_MONEY_ACTIF   = true; // PVIT supporte Airtel + Moov Gabon

// Frais de traitement Mobile Money — facturés au client, reversés au vendeur
export const FRAIS_MOBILE_MONEY_TAUX = 0.03; // 3 %
