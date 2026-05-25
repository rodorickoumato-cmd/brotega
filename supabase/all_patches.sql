-- ============================================================
-- PATCHES CONSOLIDÉS — À exécuter dans Supabase SQL Editor
-- Toutes les opérations sont idempotentes (IF NOT EXISTS)
-- ============================================================

-- ─── PATCH 1 : Colonnes utilisateurs ─────────────────────────
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS email            TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS email_verifie    BOOLEAN DEFAULT FALSE;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS whatsapp         TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- ─── PATCH 2 : Colonnes produits + trigger nb_produits ────────
ALTER TABLE produits ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS categorie   TEXT;

CREATE OR REPLACE FUNCTION sync_nb_produits()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vendeurs SET nb_produits = nb_produits + 1 WHERE id = NEW.vendeur_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vendeurs SET nb_produits = GREATEST(nb_produits - 1, 0) WHERE id = OLD.vendeur_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_produits_nb ON produits;
CREATE TRIGGER trg_produits_nb
AFTER INSERT OR DELETE ON produits
FOR EACH ROW EXECUTE FUNCTION sync_nb_produits();

UPDATE vendeurs v
SET nb_produits = (SELECT COUNT(*) FROM produits p WHERE p.vendeur_id = v.id);

-- ─── PATCH 3 : Rôle livreur + colonne commandes ───────────────
ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('acheteur', 'vendeur', 'livreur', 'admin'));

ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_commandes_livreur ON commandes(livreur_id);

-- Policies livreur (ignore si déjà existantes)
DO $$ BEGIN
  CREATE POLICY "commandes_lecture_livreur" ON commandes FOR SELECT
    USING (livreur_id = auth.uid() OR utilisateur_id = auth.uid() OR
           vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "commandes_update_livreur" ON commandes FOR UPDATE
    USING (livreur_id = auth.uid()) WITH CHECK (livreur_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── PATCH 4 : Paiements + Wallets + Escrow ──────────────────
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS code_court          TEXT UNIQUE;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS telephone_paiement  TEXT;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paye_at             TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livree_at           TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS escrow_libere_at    TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS frais_livraison     INTEGER DEFAULT 2500;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS commission_xaf      INTEGER DEFAULT 0;

ALTER TABLE commandes DROP CONSTRAINT IF EXISTS commandes_statut_check;
ALTER TABLE commandes ADD CONSTRAINT commandes_statut_check
  CHECK (statut IN ('en_attente_paiement','payee_escrow','confirmee_vendeur',
                    'en_livraison','livree','litige','remboursee','annulee'));

UPDATE commandes SET statut = 'en_attente_paiement' WHERE statut = 'en_attente';
UPDATE commandes SET statut = 'confirmee_vendeur'   WHERE statut = 'confirme';
UPDATE commandes SET statut = 'en_livraison'        WHERE statut = 'expedie';
UPDATE commandes SET statut = 'livree'              WHERE statut = 'livre';
UPDATE commandes SET statut = 'annulee'             WHERE statut = 'annule';

ALTER TABLE commandes ALTER COLUMN statut SET DEFAULT 'en_attente_paiement';

CREATE INDEX IF NOT EXISTS idx_commandes_code   ON commandes(code_court);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);

CREATE TABLE IF NOT EXISTS paiements (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id      UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  provider         TEXT NOT NULL CHECK (provider IN ('airtel','moov','cash','mock')),
  provider_ref     TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  montant_xaf      INTEGER NOT NULL CHECK (montant_xaf >= 0),
  telephone        TEXT,
  statut           TEXT NOT NULL DEFAULT 'initie'
                     CHECK (statut IN ('initie','en_attente','reussi','echec','rembourse')),
  message_erreur   TEXT,
  raw_callback     JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paiements_commande    ON paiements(commande_id);
CREATE INDEX IF NOT EXISTS idx_paiements_statut      ON paiements(statut);
CREATE INDEX IF NOT EXISTS idx_paiements_provider_ref ON paiements(provider_ref);

DROP TRIGGER IF EXISTS trg_paiements_updated_at ON paiements;
CREATE TRIGGER trg_paiements_updated_at
  BEFORE UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS wallets (
  vendeur_id            UUID PRIMARY KEY REFERENCES vendeurs(id) ON DELETE CASCADE,
  balance_pending_xaf   INTEGER NOT NULL DEFAULT 0 CHECK (balance_pending_xaf >= 0),
  balance_available_xaf INTEGER NOT NULL DEFAULT 0 CHECK (balance_available_xaf >= 0),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION creer_wallet_vendeur()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (vendeur_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creer_wallet_vendeur ON vendeurs;
CREATE TRIGGER trg_creer_wallet_vendeur
  AFTER INSERT ON vendeurs FOR EACH ROW EXECUTE FUNCTION creer_wallet_vendeur();

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id            UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('credit_escrow','liberation','commission','retrait','remboursement','ajustement')),
  montant_xaf           INTEGER NOT NULL,
  solde_pending_apres   INTEGER NOT NULL,
  solde_available_apres INTEGER NOT NULL,
  commande_id           UUID REFERENCES commandes(id),
  paiement_id           UUID REFERENCES paiements(id),
  description           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_vendeur  ON wallet_transactions(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_commande ON wallet_transactions(commande_id);

CREATE OR REPLACE FUNCTION wallet_tx_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions est append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_tx_no_update ON wallet_transactions;
DROP TRIGGER IF EXISTS trg_wallet_tx_no_delete ON wallet_transactions;
CREATE TRIGGER trg_wallet_tx_no_update BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION wallet_tx_immutable();
CREATE TRIGGER trg_wallet_tx_no_delete BEFORE DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION wallet_tx_immutable();

-- RPCs
CREATE OR REPLACE FUNCTION crediter_wallet_escrow(
  p_vendeur_id UUID, p_montant INTEGER, p_commande_id UUID, p_paiement_id UUID
) RETURNS VOID AS $$
DECLARE v_pending INTEGER; v_available INTEGER;
BEGIN
  UPDATE wallets SET balance_pending_xaf = balance_pending_xaf + p_montant
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;
  IF NOT FOUND THEN
    INSERT INTO wallets (vendeur_id, balance_pending_xaf) VALUES (p_vendeur_id, p_montant)
      RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;
  END IF;
  INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf, solde_pending_apres, solde_available_apres, commande_id, paiement_id, description)
  VALUES (p_vendeur_id, 'credit_escrow', p_montant, v_pending, v_available, p_commande_id, p_paiement_id, 'Paiement reçu — bloqué en escrow');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION liberer_escrow(
  p_vendeur_id UUID, p_montant INTEGER, p_commission INTEGER, p_commande_id UUID
) RETURNS VOID AS $$
DECLARE v_pending INTEGER; v_available INTEGER; v_net INTEGER := p_montant - p_commission;
BEGIN
  UPDATE wallets SET balance_pending_xaf = balance_pending_xaf - p_montant,
                     balance_available_xaf = balance_available_xaf + v_net
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;
  INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf, solde_pending_apres, solde_available_apres, commande_id, description)
  VALUES (p_vendeur_id, 'liberation', v_net, v_pending, v_available, p_commande_id, 'Libération escrow après livraison');
  IF p_commission > 0 THEN
    INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf, solde_pending_apres, solde_available_apres, commande_id, description)
    VALUES (p_vendeur_id, 'commission', -p_commission, v_pending, v_available, p_commande_id, 'Commission Brotega 5%');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS paiements / wallets / transactions
ALTER TABLE paiements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "paiements_lecture_acheteur" ON paiements FOR SELECT
    USING (commande_id IN (SELECT id FROM commandes WHERE utilisateur_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "paiements_lecture_vendeur" ON paiements FOR SELECT
    USING (commande_id IN (SELECT id FROM commandes WHERE vendeur_id IN
      (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wallets_lecture_propre" ON wallets FOR SELECT
    USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wallet_tx_lecture_propre" ON wallet_transactions FOR SELECT
    USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Wallets pour vendeurs existants
INSERT INTO wallets (vendeur_id) SELECT id FROM vendeurs ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN — Tous les patches appliqués
-- ============================================================
