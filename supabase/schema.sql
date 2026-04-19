-- ============================================================
-- SCHÉMA SUPABASE — BROTEGA MARKETPLACE GABON
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. TABLE UTILISATEURS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL,
  telephone   TEXT,
  ville       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'acheteur'
                CHECK (role IN ('acheteur', 'vendeur', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. TABLE VENDEURS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendeurs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id  UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
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

-- ─── 3. TABLE PRODUITS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS produits (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id      UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT NOT NULL,
  prix            INTEGER NOT NULL CHECK (prix >= 0),
  prix_original   INTEGER CHECK (prix_original > prix OR prix_original IS NULL),
  images          TEXT[] DEFAULT '{}',
  categorie       TEXT NOT NULL,
  sous_categorie  TEXT,
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unite           TEXT,
  tags            TEXT[] DEFAULT '{}',
  ville           TEXT NOT NULL,
  est_nouveau     BOOLEAN DEFAULT TRUE,
  est_vedette     BOOLEAN DEFAULT FALSE,
  actif           BOOLEAN DEFAULT TRUE,
  note            NUMERIC(2,1) DEFAULT 0,
  nb_avis         INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. TABLE COMMANDES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id   UUID REFERENCES utilisateurs(id),
  vendeur_id       UUID REFERENCES vendeurs(id),
  articles         JSONB NOT NULL DEFAULT '[]',
  total            INTEGER NOT NULL CHECK (total >= 0),
  statut           TEXT DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente','confirme','expedie','livre','annule')),
  mode_paiement    TEXT CHECK (mode_paiement IN ('airtel_money','moov_money','especes','carte')),
  statut_paiement  TEXT DEFAULT 'en_attente'
                     CHECK (statut_paiement IN ('en_attente','paye','echec')),
  adresse          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. TABLE ABONNEMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS abonnements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendeur_id   UUID REFERENCES vendeurs(id) ON DELETE CASCADE NOT NULL,
  plan         TEXT NOT NULL
                 CHECK (plan IN ('gratuit','mensuel','trimestriel','semestriel','annuel')),
  prix         INTEGER NOT NULL DEFAULT 0,
  statut       TEXT DEFAULT 'actif'
                 CHECK (statut IN ('actif','expire','annule')),
  date_debut   TIMESTAMPTZ DEFAULT NOW(),
  date_fin     TIMESTAMPTZ,
  max_produits INTEGER DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT NOW()
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

CREATE TRIGGER trg_utilisateurs_updated_at
  BEFORE UPDATE ON utilisateurs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vendeurs_updated_at
  BEFORE UPDATE ON vendeurs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_produits_updated_at
  BEFORE UPDATE ON produits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_commandes_updated_at
  BEFORE UPDATE ON commandes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEX — performances
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_produits_vendeur     ON produits(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie   ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_ville       ON produits(ville);
CREATE INDEX IF NOT EXISTS idx_produits_actif       ON produits(actif) WHERE actif = TRUE;
CREATE INDEX IF NOT EXISTS idx_vendeurs_utilisateur ON vendeurs(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_utilisateur ON commandes(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_vendeur    ON commandes(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_vendeur  ON abonnements(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_statut   ON abonnements(statut) WHERE statut = 'actif';

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE utilisateurs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendeurs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements    ENABLE ROW LEVEL SECURITY;

-- ── UTILISATEURS ──────────────────────────────────────────────
-- Lecture : uniquement son propre profil
CREATE POLICY "utilisateurs_lecture_propre"
  ON utilisateurs FOR SELECT
  USING (auth.uid() = id);

-- Création : uniquement son propre profil
CREATE POLICY "utilisateurs_creation_propre"
  ON utilisateurs FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Modification : uniquement son propre profil
CREATE POLICY "utilisateurs_modification_propre"
  ON utilisateurs FOR UPDATE
  USING (auth.uid() = id);

-- ── VENDEURS ──────────────────────────────────────────────────
-- Lecture publique pour tous
CREATE POLICY "vendeurs_lecture_publique"
  ON vendeurs FOR SELECT
  USING (true);

-- Création : utilisateur connecté pour sa propre boutique
CREATE POLICY "vendeurs_creation_propre"
  ON vendeurs FOR INSERT
  WITH CHECK (auth.uid() = utilisateur_id);

-- Modification : uniquement le propriétaire de la boutique
CREATE POLICY "vendeurs_modification_propre"
  ON vendeurs FOR UPDATE
  USING (auth.uid() = utilisateur_id);

-- ── PRODUITS ──────────────────────────────────────────────────
-- Lecture publique des produits actifs
CREATE POLICY "produits_lecture_publique"
  ON produits FOR SELECT
  USING (actif = TRUE OR vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Création : vendeur pour ses propres produits
CREATE POLICY "produits_creation_propre"
  ON produits FOR INSERT
  WITH CHECK (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Modification : vendeur pour ses propres produits
CREATE POLICY "produits_modification_propre"
  ON produits FOR UPDATE
  USING (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Suppression : vendeur pour ses propres produits
CREATE POLICY "produits_suppression_propre"
  ON produits FOR DELETE
  USING (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- ── COMMANDES ─────────────────────────────────────────────────
-- Acheteur : voir ses propres commandes
CREATE POLICY "commandes_lecture_acheteur"
  ON commandes FOR SELECT
  USING (auth.uid() = utilisateur_id);

-- Vendeur : voir les commandes de sa boutique
CREATE POLICY "commandes_lecture_vendeur"
  ON commandes FOR SELECT
  USING (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Création : utilisateur connecté
CREATE POLICY "commandes_creation"
  ON commandes FOR INSERT
  WITH CHECK (auth.uid() = utilisateur_id);

-- ── ABONNEMENTS ───────────────────────────────────────────────
-- Vendeur : voir ses propres abonnements
CREATE POLICY "abonnements_lecture_propre"
  ON abonnements FOR SELECT
  USING (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Vendeur : créer un abonnement pour sa boutique
CREATE POLICY "abonnements_creation_propre"
  ON abonnements FOR INSERT
  WITH CHECK (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- Vendeur : modifier ses propres abonnements (ex: expire)
CREATE POLICY "abonnements_modification_propre"
  ON abonnements FOR UPDATE
  USING (vendeur_id IN (
    SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
  ));

-- ============================================================
-- FIN DU SCHÉMA
-- Exécutez ce fichier entier dans :
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================
