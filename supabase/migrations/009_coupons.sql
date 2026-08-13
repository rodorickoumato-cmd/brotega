-- ─── Coupons de réduction (Phase 2 — Admin Center) ──────────────────────────
-- Codes promo génériques, indépendants des promotions par produit
-- (prix_promo/promo_actif sur `produits`, qui restent gérées par le vendeur).
-- Un coupon est créé et géré par l'admin, appliqué au checkout.

CREATE TABLE IF NOT EXISTS coupons (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT        NOT NULL UNIQUE,
  type                  TEXT        NOT NULL CHECK (type IN ('pourcentage', 'montant_fixe', 'livraison_gratuite')),
  valeur                INTEGER     NOT NULL DEFAULT 0, -- % (0-100) ou XAF selon le type ; ignoré si livraison_gratuite
  utilisation_max       INTEGER,                         -- NULL = illimité
  utilisation_actuelle  INTEGER     NOT NULL DEFAULT 0,
  montant_min_xaf       INTEGER     NOT NULL DEFAULT 0,
  actif                 BOOLEAN     NOT NULL DEFAULT true,
  expire_le             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_par           UUID        REFERENCES auth.users(id)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- Aucune policy : la validation d'un coupon passe toujours par le serveur
-- (service_role), jamais par une lecture directe côté client — on ne veut
-- pas qu'un acheteur puisse lister tous les codes actifs via l'API Supabase.

-- Traçabilité sur la commande : quel coupon, quelle réduction réellement
-- appliquée (le frais_livraison réel n'est jamais modifié par un coupon —
-- voir src/lib/coupons.ts — pour ne pas fausser la rémunération livreur).
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS coupon_code   TEXT;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS reduction_xaf INTEGER NOT NULL DEFAULT 0;

-- Incrémente l'usage de façon atomique (évite une race condition entre la
-- lecture de utilisation_actuelle et son écriture lors de deux commandes
-- concurrentes sur le même code).
CREATE OR REPLACE FUNCTION incrementer_utilisation_coupon(p_coupon_id UUID)
RETURNS void AS $$
  UPDATE coupons SET utilisation_actuelle = utilisation_actuelle + 1 WHERE id = p_coupon_id;
$$ LANGUAGE sql;
