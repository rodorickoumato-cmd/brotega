-- ─── Fix 1 : Suivi paiement rémunération livreur ─────────────────────────────
ALTER TABLE livraisons
  ADD COLUMN IF NOT EXISTS remuneration_versee     BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remuneration_versee_at  TIMESTAMPTZ;

-- ─── Fix 2 : Candidatures livreur ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidatures_livreur (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  vehicule        TEXT        NOT NULL CHECK (vehicule IN ('moto', 'velo', 'voiture', 'autre')),
  zone            TEXT        NOT NULL,
  message         TEXT,
  statut          TEXT        NOT NULL DEFAULT 'en_attente'
                              CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  traite_par      UUID        REFERENCES utilisateurs(id),
  traite_le       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidatures_livreur ENABLE ROW LEVEL SECURITY;

-- Le candidat peut soumettre et lire sa propre candidature
CREATE POLICY "candidature_insert" ON candidatures_livreur
  FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "candidature_select" ON candidatures_livreur
  FOR SELECT USING (auth.uid() = utilisateur_id);
