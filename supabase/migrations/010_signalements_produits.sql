-- ─── Signalements produits (Phase 2 — Admin Center) ─────────────────────────
-- Modération a posteriori, décidée explicitement avec l'utilisateur : les
-- vendeurs publient toujours instantanément (aucun changement de
-- comportement pour eux). Acheteurs et admin peuvent signaler un produit
-- problématique ; l'admin le traite depuis /admin/produits.

CREATE TABLE IF NOT EXISTS signalements_produits (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id     UUID        NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  utilisateur_id UUID        REFERENCES auth.users(id),
  motif          TEXT        NOT NULL,
  statut         TEXT        NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'traite')),
  traite_par     UUID        REFERENCES auth.users(id),
  traite_le      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE signalements_produits ENABLE ROW LEVEL SECURITY;

-- Un utilisateur connecté peut signaler (insertion uniquement, jamais lire
-- les signalements des autres ni modifier un signalement existant).
CREATE POLICY "creer_signalement" ON signalements_produits
  FOR INSERT
  WITH CHECK (auth.uid() = utilisateur_id);

-- Lecture/traitement réservés au service_role (admin, via createAdminClient).
