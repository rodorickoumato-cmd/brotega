-- ============================================================
-- MIGRATION PAIEMENTS + WALLET + ESCROW — BROTEGA GABON
-- À exécuter APRÈS schema.sql
-- ============================================================

-- ─── 1. ÉTENDRE LA TABLE COMMANDES ───────────────────────────
-- Ajout : code court (BR-XXXXX) + nouveaux statuts escrow + horodatages

ALTER TABLE commandes ADD COLUMN IF NOT EXISTS code_court TEXT UNIQUE;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS telephone_paiement TEXT;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paye_at TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livree_at TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS escrow_libere_at TIMESTAMPTZ;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS frais_livraison INTEGER DEFAULT 0;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS commission_xaf INTEGER DEFAULT 0;

-- Étendre les statuts (drop + recreate la contrainte CHECK)
ALTER TABLE commandes DROP CONSTRAINT IF EXISTS commandes_statut_check;
ALTER TABLE commandes ADD CONSTRAINT commandes_statut_check
  CHECK (statut IN (
    'en_attente_paiement', 'payee_escrow', 'confirmee_vendeur',
    'en_livraison', 'livree', 'litige', 'remboursee', 'annulee'
  ));

-- Migration des anciennes valeurs si existantes
UPDATE commandes SET statut = 'en_attente_paiement' WHERE statut = 'en_attente';
UPDATE commandes SET statut = 'confirmee_vendeur'   WHERE statut = 'confirme';
UPDATE commandes SET statut = 'en_livraison'        WHERE statut = 'expedie';
UPDATE commandes SET statut = 'livree'              WHERE statut = 'livre';
UPDATE commandes SET statut = 'annulee'             WHERE statut = 'annule';

ALTER TABLE commandes ALTER COLUMN statut SET DEFAULT 'en_attente_paiement';

CREATE INDEX IF NOT EXISTS idx_commandes_code        ON commandes(code_court);
CREATE INDEX IF NOT EXISTS idx_commandes_statut      ON commandes(statut);

-- ─── 2. TABLE PAIEMENTS ──────────────────────────────────────
-- Trace toutes les tentatives de paiement (audit complet)

CREATE TABLE IF NOT EXISTS paiements (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id       UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  provider          TEXT NOT NULL CHECK (provider IN ('airtel','moov','cash','mock')),
  provider_ref      TEXT,
  idempotency_key   TEXT NOT NULL UNIQUE,
  montant_xaf       INTEGER NOT NULL CHECK (montant_xaf >= 0),
  telephone         TEXT,
  statut            TEXT NOT NULL DEFAULT 'initie'
                      CHECK (statut IN ('initie','en_attente','reussi','echec','rembourse')),
  message_erreur    TEXT,
  raw_callback      JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paiements_commande  ON paiements(commande_id);
CREATE INDEX IF NOT EXISTS idx_paiements_statut    ON paiements(statut);
CREATE INDEX IF NOT EXISTS idx_paiements_provider_ref ON paiements(provider_ref);

CREATE TRIGGER trg_paiements_updated_at
  BEFORE UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. TABLE WALLETS (un par vendeur) ───────────────────────

CREATE TABLE IF NOT EXISTS wallets (
  vendeur_id              UUID PRIMARY KEY REFERENCES vendeurs(id) ON DELETE CASCADE,
  balance_pending_xaf     INTEGER NOT NULL DEFAULT 0 CHECK (balance_pending_xaf >= 0),
  balance_available_xaf   INTEGER NOT NULL DEFAULT 0 CHECK (balance_available_xaf >= 0),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-création du wallet à la création d'un vendeur
CREATE OR REPLACE FUNCTION creer_wallet_vendeur()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (vendeur_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_creer_wallet_vendeur
  AFTER INSERT ON vendeurs
  FOR EACH ROW EXECUTE FUNCTION creer_wallet_vendeur();

-- ─── 4. TABLE WALLET_TRANSACTIONS (append-only) ──────────────

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id    UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  type          TEXT NOT NULL
                  CHECK (type IN ('credit_escrow','liberation','commission','retrait','remboursement','ajustement')),
  montant_xaf   INTEGER NOT NULL,
  solde_pending_apres   INTEGER NOT NULL,
  solde_available_apres INTEGER NOT NULL,
  commande_id   UUID REFERENCES commandes(id),
  paiement_id   UUID REFERENCES paiements(id),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_vendeur ON wallet_transactions(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_commande ON wallet_transactions(commande_id);

-- Append-only : interdire UPDATE/DELETE
CREATE OR REPLACE FUNCTION wallet_tx_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions est append-only. Aucune modification autorisée.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_tx_no_update BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION wallet_tx_immutable();
CREATE TRIGGER trg_wallet_tx_no_delete BEFORE DELETE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION wallet_tx_immutable();

-- ─── 5. RPC : créditer wallet (escrow) — atomique ────────────

CREATE OR REPLACE FUNCTION crediter_wallet_escrow(
  p_vendeur_id UUID, p_montant INTEGER,
  p_commande_id UUID, p_paiement_id UUID
) RETURNS VOID AS $$
DECLARE
  v_pending INTEGER; v_available INTEGER;
BEGIN
  UPDATE wallets
    SET balance_pending_xaf = balance_pending_xaf + p_montant
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;

  IF NOT FOUND THEN
    INSERT INTO wallets (vendeur_id, balance_pending_xaf)
      VALUES (p_vendeur_id, p_montant)
      RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;
  END IF;

  INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres, commande_id, paiement_id, description)
  VALUES (p_vendeur_id, 'credit_escrow', p_montant,
    v_pending, v_available, p_commande_id, p_paiement_id, 'Paiement reçu — bloqué en escrow');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. RPC : libérer escrow (montant - commission) ──────────

CREATE OR REPLACE FUNCTION liberer_escrow(
  p_vendeur_id UUID, p_montant INTEGER,
  p_commission INTEGER, p_commande_id UUID
) RETURNS VOID AS $$
DECLARE
  v_pending INTEGER; v_available INTEGER;
  v_montant_net INTEGER := p_montant - p_commission;
BEGIN
  UPDATE wallets
    SET balance_pending_xaf = balance_pending_xaf - p_montant,
        balance_available_xaf = balance_available_xaf + v_montant_net
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf INTO v_pending, v_available;

  INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres, commande_id, description)
  VALUES (p_vendeur_id, 'liberation', v_montant_net,
    v_pending, v_available, p_commande_id, 'Libération escrow après livraison');

  IF p_commission > 0 THEN
    INSERT INTO wallet_transactions (vendeur_id, type, montant_xaf,
      solde_pending_apres, solde_available_apres, commande_id, description)
    VALUES (p_vendeur_id, 'commission', -p_commission,
      v_pending, v_available, p_commande_id, 'Commission Brotega 5%');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. RLS PAIEMENTS / WALLETS / TX ─────────────────────────

ALTER TABLE paiements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Paiements : acheteur voit ses paiements via commande
CREATE POLICY "paiements_lecture_acheteur" ON paiements FOR SELECT
  USING (commande_id IN (SELECT id FROM commandes WHERE utilisateur_id = auth.uid()));

CREATE POLICY "paiements_lecture_vendeur" ON paiements FOR SELECT
  USING (commande_id IN (
    SELECT id FROM commandes WHERE vendeur_id IN (
      SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
    )
  ));

-- Wallets : seul le vendeur voit son wallet
CREATE POLICY "wallets_lecture_propre" ON wallets FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- Wallet transactions : seul le vendeur voit ses tx
CREATE POLICY "wallet_tx_lecture_propre" ON wallet_transactions FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- INSERTS sur paiements / wallets / wallet_tx → uniquement par service_role (server actions)
-- Aucune policy INSERT/UPDATE = bloqué pour les clients (RLS strict)

-- ─── 8. CRÉER LES WALLETS POUR LES VENDEURS EXISTANTS ────────

INSERT INTO wallets (vendeur_id)
SELECT id FROM vendeurs ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN MIGRATION PAIEMENTS
-- ============================================================
