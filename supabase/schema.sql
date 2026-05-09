-- ============================================================
-- SCHÉMA SUPABASE — BROTEGA V1
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. UTILISATEURS ─────────────────────────────────────────
-- Auth OTP par téléphone.
-- Rôles : acheteur | vendeur | livreur | admin
CREATE TABLE IF NOT EXISTS utilisateurs (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom         TEXT NOT NULL,
  telephone   TEXT UNIQUE,
  role        TEXT NOT NULL DEFAULT 'acheteur'
                CHECK (role IN ('acheteur', 'vendeur', 'livreur', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. VENDEURS ─────────────────────────────────────────────
-- 1 utilisateur = 1 boutique max.
-- Statut : en_attente → verifie (admin) ou suspendu (admin).
CREATE TABLE IF NOT EXISTS vendeurs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id  UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nom             TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  ville           TEXT NOT NULL,
  telephone       TEXT,
  whatsapp        TEXT,
  categories      TEXT[] DEFAULT '{}',
  statut          TEXT DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'verifie', 'suspendu')),
  note            NUMERIC(2,1) DEFAULT 0,
  nb_avis         INTEGER DEFAULT 0,
  nb_produits     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. ABONNEMENTS ──────────────────────────────────────────
-- Gratuit = 3 produits max. Payant = illimité.
-- Un seul abonnement actif par vendeur à la fois.
CREATE TABLE IF NOT EXISTS abonnements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id   UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  plan         TEXT NOT NULL
                 CHECK (plan IN ('gratuit', 'mensuel', 'trimestriel', 'semestriel', 'annuel')),
  prix_xaf     INTEGER NOT NULL DEFAULT 0,
  statut       TEXT DEFAULT 'actif'
                 CHECK (statut IN ('actif', 'expire', 'annule')),
  max_produits INTEGER NOT NULL DEFAULT 3,
  date_debut   TIMESTAMPTZ DEFAULT NOW(),
  date_fin     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. PRODUITS ─────────────────────────────────────────────
-- statut : actif | inactif (désactivé si vendeur dépasse sa limite de plan)
CREATE TABLE IF NOT EXISTS produits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id  UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  nom         TEXT NOT NULL,
  prix        INTEGER NOT NULL CHECK (prix >= 0),
  image       TEXT,
  statut      TEXT NOT NULL DEFAULT 'actif'
                CHECK (statut IN ('actif', 'inactif')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. COMMANDES ────────────────────────────────────────────
-- 1 commande = 1 seul vendeur. Frais livraison fixes = 2500 XAF.
-- Commission 5% prélevée à la libération de l'escrow.
CREATE TABLE IF NOT EXISTS commandes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_court          TEXT UNIQUE,
  utilisateur_id      UUID REFERENCES utilisateurs(id),
  vendeur_id          UUID REFERENCES vendeurs(id),
  livreur_id          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  articles            JSONB NOT NULL DEFAULT '[]',
  total               INTEGER NOT NULL CHECK (total >= 0),
  frais_livraison     INTEGER NOT NULL DEFAULT 2500,
  commission_xaf      INTEGER NOT NULL DEFAULT 0,
  statut              TEXT DEFAULT 'en_attente_paiement'
                        CHECK (statut IN (
                          'en_attente_paiement', 'payee_escrow', 'confirmee_vendeur',
                          'en_livraison', 'livree', 'litige', 'remboursee', 'annulee'
                        )),
  mode_paiement       TEXT CHECK (mode_paiement IN ('airtel_money', 'moov_money', 'especes')),
  statut_paiement     TEXT DEFAULT 'en_attente'
                        CHECK (statut_paiement IN ('en_attente', 'paye', 'echec')),
  telephone_paiement  TEXT,
  adresse             JSONB NOT NULL DEFAULT '{}',
  paye_at             TIMESTAMPTZ,
  livree_at           TIMESTAMPTZ,
  escrow_libere_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. PAIEMENTS ────────────────────────────────────────────
-- Trace de chaque tentative de paiement Mobile Money.
CREATE TABLE IF NOT EXISTS paiements (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id      UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  provider         TEXT NOT NULL CHECK (provider IN ('airtel', 'moov', 'cash', 'mock')),
  provider_ref     TEXT,
  idempotency_key  TEXT UNIQUE NOT NULL,
  montant_xaf      INTEGER NOT NULL,
  telephone        TEXT,
  statut           TEXT DEFAULT 'initie'
                     CHECK (statut IN ('initie', 'en_attente', 'reussi', 'echec', 'rembourse')),
  message_erreur   TEXT,
  raw_callback     JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. LIVRAISONS ───────────────────────────────────────────
-- Assignée par l'admin. Le livreur met à jour le statut.
CREATE TABLE IF NOT EXISTS livraisons (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id   UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  livreur_id    UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut        TEXT DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente', 'assignee', 'en_route', 'livree', 'echec')),
  note_livreur  TEXT,
  assignee_at   TIMESTAMPTZ,
  livree_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. MESSAGES (Chat) ──────────────────────────────────────
-- Acheteur ↔ Vendeur uniquement. Toujours lié à une commande.
CREATE TABLE IF NOT EXISTS messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id   UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  expediteur_id UUID REFERENCES utilisateurs(id) NOT NULL,
  contenu       TEXT NOT NULL CHECK (char_length(contenu) BETWEEN 1 AND 1000),
  lu            BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. RECLAMATIONS ─────────────────────────────────────────
-- Bloque l'escrow. Résolue uniquement par l'admin.
CREATE TABLE IF NOT EXISTS reclamations (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id    UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  utilisateur_id UUID REFERENCES utilisateurs(id) NOT NULL,
  motif          TEXT NOT NULL CHECK (char_length(motif) BETWEEN 10 AND 500),
  statut         TEXT DEFAULT 'ouverte'
                   CHECK (statut IN ('ouverte', 'en_cours', 'resolue_acheteur', 'resolue_vendeur', 'fermee')),
  resolution     TEXT,
  admin_id       UUID REFERENCES utilisateurs(id),
  resolue_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. WALLETS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  vendeur_id              UUID REFERENCES vendeurs(id) ON DELETE CASCADE PRIMARY KEY,
  balance_pending_xaf     INTEGER NOT NULL DEFAULT 0 CHECK (balance_pending_xaf >= 0),
  balance_available_xaf   INTEGER NOT NULL DEFAULT 0 CHECK (balance_available_xaf >= 0),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. WALLET_TRANSACTIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id           UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  type                 TEXT NOT NULL
                         CHECK (type IN ('credit_escrow', 'liberation', 'commission', 'retrait', 'remboursement', 'ajustement')),
  montant_xaf          INTEGER NOT NULL,
  solde_pending_apres  INTEGER NOT NULL,
  solde_available_apres INTEGER NOT NULL,
  commande_id          UUID REFERENCES commandes(id),
  paiement_id          UUID REFERENCES paiements(id),
  description          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — updated_at automatique
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendeurs_updated_at      BEFORE UPDATE ON vendeurs      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_produits_updated_at      BEFORE UPDATE ON produits      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commandes_updated_at     BEFORE UPDATE ON commandes     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_paiements_updated_at     BEFORE UPDATE ON paiements     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_livraisons_updated_at    BEFORE UPDATE ON livraisons    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reclamations_updated_at  BEFORE UPDATE ON reclamations  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_produits_vendeur  ON produits(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_produits_statut   ON produits(statut) WHERE statut = 'actif';
CREATE INDEX IF NOT EXISTS idx_vendeurs_utilisateur  ON vendeurs(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_utilisateur ON commandes(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_vendeur     ON commandes(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_livreur     ON commandes(livreur_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_vendeur   ON abonnements(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_actif     ON abonnements(statut) WHERE statut = 'actif';
CREATE INDEX IF NOT EXISTS idx_messages_commande     ON messages(commande_id);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur   ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_commande ON reclamations(commande_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_livreur    ON livraisons(livreur_id);

-- ============================================================
-- FONCTIONS RPC
-- ============================================================

-- Crédite le wallet vendeur en escrow après paiement réussi
CREATE OR REPLACE FUNCTION crediter_wallet_escrow(
  p_vendeur_id   UUID,
  p_montant      INTEGER,
  p_commande_id  UUID,
  p_paiement_id  UUID
) RETURNS VOID AS $$
DECLARE
  v_pending   INTEGER;
  v_available INTEGER;
BEGIN
  INSERT INTO wallets (vendeur_id) VALUES (p_vendeur_id)
    ON CONFLICT (vendeur_id) DO NOTHING;

  UPDATE wallets
    SET balance_pending_xaf = balance_pending_xaf + p_montant
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf
    INTO v_pending, v_available;

  INSERT INTO wallet_transactions (
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres,
    commande_id, paiement_id, description
  ) VALUES (
    p_vendeur_id, 'credit_escrow', p_montant,
    v_pending, v_available,
    p_commande_id, p_paiement_id, 'Paiement reçu — en attente livraison'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Libère l'escrow après confirmation de livraison et déduit la commission
CREATE OR REPLACE FUNCTION liberer_escrow(
  p_vendeur_id  UUID,
  p_montant     INTEGER,
  p_commission  INTEGER,
  p_commande_id UUID
) RETURNS VOID AS $$
DECLARE
  v_net       INTEGER := p_montant - p_commission;
  v_pending   INTEGER;
  v_available INTEGER;
BEGIN
  UPDATE wallets
    SET balance_pending_xaf   = balance_pending_xaf   - p_montant,
        balance_available_xaf = balance_available_xaf + v_net
    WHERE vendeur_id = p_vendeur_id
    RETURNING balance_pending_xaf, balance_available_xaf
    INTO v_pending, v_available;

  INSERT INTO wallet_transactions (
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres,
    commande_id, description
  ) VALUES (
    p_vendeur_id, 'liberation', v_net,
    v_pending, v_available,
    p_commande_id, 'Livraison confirmée — fonds libérés'
  );

  INSERT INTO wallet_transactions (
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres,
    commande_id, description
  ) VALUES (
    p_vendeur_id, 'commission', -p_commission,
    v_pending, v_available,
    p_commande_id, 'Commission Brotega 5%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE utilisateurs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendeurs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE livraisons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ── UTILISATEURS ──────────────────────────────────────────────
CREATE POLICY "util_select_propre"  ON utilisateurs FOR SELECT USING (auth.uid() = id);
CREATE POLICY "util_insert_propre"  ON utilisateurs FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "util_update_propre"  ON utilisateurs FOR UPDATE USING (auth.uid() = id);

-- ── VENDEURS ──────────────────────────────────────────────────
CREATE POLICY "vendeur_select_public"  ON vendeurs FOR SELECT USING (true);
CREATE POLICY "vendeur_insert_propre"  ON vendeurs FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "vendeur_update_propre"  ON vendeurs FOR UPDATE USING (auth.uid() = utilisateur_id);

-- ── ABONNEMENTS ───────────────────────────────────────────────
CREATE POLICY "abo_select_propre"  ON abonnements FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "abo_insert_propre"  ON abonnements FOR INSERT
  WITH CHECK (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "abo_update_propre"  ON abonnements FOR UPDATE
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- ── PRODUITS ──────────────────────────────────────────────────
CREATE POLICY "produit_select_public"  ON produits FOR SELECT
  USING (statut = 'actif' OR vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "produit_insert_propre"  ON produits FOR INSERT
  WITH CHECK (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "produit_update_propre"  ON produits FOR UPDATE
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "produit_delete_propre"  ON produits FOR DELETE
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- ── COMMANDES ─────────────────────────────────────────────────
CREATE POLICY "commande_select_acheteur"  ON commandes FOR SELECT USING (auth.uid() = utilisateur_id);
CREATE POLICY "commande_select_vendeur"   ON commandes FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));
CREATE POLICY "commande_select_livreur"   ON commandes FOR SELECT USING (auth.uid() = livreur_id);
CREATE POLICY "commande_insert"           ON commandes FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "commande_update_livreur"   ON commandes FOR UPDATE USING (auth.uid() = livreur_id);

-- ── LIVRAISONS ────────────────────────────────────────────────
CREATE POLICY "livraison_select_livreur"  ON livraisons FOR SELECT USING (auth.uid() = livreur_id);
CREATE POLICY "livraison_select_acheteur" ON livraisons FOR SELECT
  USING (commande_id IN (SELECT id FROM commandes WHERE utilisateur_id = auth.uid()));
CREATE POLICY "livraison_select_vendeur"  ON livraisons FOR SELECT
  USING (commande_id IN (
    SELECT id FROM commandes WHERE vendeur_id IN (
      SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
    )
  ));
CREATE POLICY "livraison_update_livreur"  ON livraisons FOR UPDATE USING (auth.uid() = livreur_id);

-- ── MESSAGES ──────────────────────────────────────────────────
CREATE POLICY "message_select"  ON messages FOR SELECT
  USING (
    commande_id IN (
      SELECT id FROM commandes
      WHERE utilisateur_id = auth.uid()
         OR vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid())
    )
  );
CREATE POLICY "message_insert"  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = expediteur_id
    AND commande_id IN (
      SELECT id FROM commandes
      WHERE utilisateur_id = auth.uid()
         OR vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid())
    )
  );

-- ── RÉCLAMATIONS ──────────────────────────────────────────────
CREATE POLICY "reclam_select_acheteur"  ON reclamations FOR SELECT USING (auth.uid() = utilisateur_id);
CREATE POLICY "reclam_select_vendeur"   ON reclamations FOR SELECT
  USING (commande_id IN (
    SELECT id FROM commandes WHERE vendeur_id IN (
      SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
    )
  ));
CREATE POLICY "reclam_insert"           ON reclamations FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

-- ── WALLETS ───────────────────────────────────────────────────
CREATE POLICY "wallet_select_propre"  ON wallets FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- ── WALLET_TRANSACTIONS ───────────────────────────────────────
CREATE POLICY "wallet_tx_select_propre"  ON wallet_transactions FOR SELECT
  USING (vendeur_id IN (SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()));

-- ============================================================
-- FIN DU SCHÉMA
-- Exécutez ce fichier entier dans :
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================
