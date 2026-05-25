// ─── RÈGLES BUSINESS J'ADORE LA FAMILLE V1 ───────────────────────────────
// Ce fichier est la loi interne. Toute logique métier s'appuie ici.
// Ne jamais hardcoder ces valeurs ailleurs dans le code.

// ─── ABONNEMENTS ──────────────────────────────────────────────

export const PLANS = {
  gratuit:      { label: "Découverte",         prix_xaf: 0,      max_produits: 3,         duree_jours: null },
  mensuel:      { label: "Business Mensuel",   prix_xaf: 2_000,  max_produits: Infinity,  duree_jours: 30   },
  trimestriel:  { label: "Business Trimestriel", prix_xaf: 5_000, max_produits: Infinity, duree_jours: 90   },
  semestriel:   { label: "Business Semestriel", prix_xaf: 8_000, max_produits: Infinity,  duree_jours: 180  },
  annuel:       { label: "Business Annuel",    prix_xaf: 15_000, max_produits: Infinity,  duree_jours: 365  },
} as const;

export type PlanId = keyof typeof PLANS;

// Règle : un vendeur sans abonnement actif est traité comme "gratuit"
export const PLAN_DEFAUT: PlanId = "gratuit";

// ─── PRODUITS ─────────────────────────────────────────────────

// Règle : plan gratuit = 3 produits max
export const MAX_PRODUITS_GRATUIT = 3;

// Règle : produit désactivé automatiquement si vendeur dépasse sa limite
// (à vérifier côté serveur à chaque publication)
export function peutAjouterProduit(nbActuels: number, maxPlan: number): boolean {
  return nbActuels < maxPlan;
}

// ─── VENDEUR ──────────────────────────────────────────────────

// Règle : un vendeur doit être validé par l'admin avant de vendre
// statut = "en_attente" → "verifie" (admin) ou "suspendu" (admin)
export const STATUTS_VENDEUR = ["en_attente", "verifie", "suspendu"] as const;
export type StatutVendeur = typeof STATUTS_VENDEUR[number];

// Règle : un utilisateur = une seule boutique
export const MAX_BOUTIQUES_PAR_UTILISATEUR = 1;

// ─── COMMANDES ────────────────────────────────────────────────

// Règle : une commande = un seul vendeur (pas de panier multi-vendeur)
export const MAX_VENDEURS_PAR_COMMANDE = 1;

// Règle : frais de livraison fixes (V1 — pas de zones)
export const FRAIS_LIVRAISON_XAF = 2_500;

// Règle : modèle 100 % abonnement — aucune commission prélevée sur les ventes
export const TAUX_COMMISSION = 0; // 0 % — revenus via abonnements uniquement

// Règle : statuts possibles d'une commande (dans l'ordre chronologique)
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

// Règle : paiement espèces → commande confirmée directement (pas d'escrow Mobile Money)
// Règle : paiement Mobile Money → confirmée seulement après succès webhook PawaPay

// ─── ESCROW / WALLET ──────────────────────────────────────────

// Règle : l'argent est bloqué (escrow) jusqu'à confirmation de livraison par l'acheteur
// Règle : auto-libération si l'acheteur ne confirme pas dans ce délai
export const JOURS_AUTO_LIBERATION_ESCROW = 7;

// Règle : retrait minimum
export const RETRAIT_MIN_XAF = 5_000;

// Règle : 1 retrait par jour maximum par vendeur
export const MAX_RETRAITS_PAR_JOUR = 1;

// ─── LIVRAISON ────────────────────────────────────────────────

// Règle : livraison assignée par l'admin après confirmation vendeur
// Règle : le livreur met à jour le statut (en_livraison → livree)
// Règle : un livreur ne voit que ses commandes assignées

// ─── RÉCLAMATIONS ─────────────────────────────────────────────

// Règle : réclamation ouvrable uniquement sur commande payée ou livrée
export const STATUTS_RECLAMATION_OUVRABLE: StatutCommande[] = [
  "payee_escrow",
  "confirmee_vendeur",
  "en_livraison",
  "livree",
];

// Règle : réclamation ouverte = escrow bloqué (libération suspendue)
// Règle : seul l'admin peut résoudre une réclamation

// ─── CHAT ─────────────────────────────────────────────────────

// Règle : chat entre acheteur ↔ vendeur uniquement
// Règle : chaque conversation est liée à une commande
// Règle : pas de chat sans commande en cours

// ─── ADMIN ────────────────────────────────────────────────────

// Règle : seul l'admin peut valider un vendeur
// Règle : seul l'admin peut assigner un livreur à une commande
// Règle : seul l'admin peut résoudre une réclamation
// Règle : seul l'admin peut suspendre un vendeur ou un livreur
