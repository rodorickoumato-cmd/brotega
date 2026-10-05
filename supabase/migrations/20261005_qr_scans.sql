-- Migration: Parcours "Scan QR" → code unique → collecte optionnelle du nom
-- Accès uniquement via service_role (API routes). Aucune policy publique.

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code remis à l'utilisateur (QR-XXXXXX, Crockford base32)
  code VARCHAR(16) NOT NULL UNIQUE,
  campagne VARCHAR(50) NOT NULL DEFAULT 'general',

  -- Jeton secret (hash SHA-256) : seul le scanneur peut ajouter son nom
  token_hash VARCHAR(64) NOT NULL,

  -- Nom optionnel
  nom VARCHAR(80),
  nom_saisi_at TIMESTAMP WITH TIME ZONE,

  -- Audit (IP hashée, jamais en clair)
  ip_hash VARCHAR(64),
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_campagne ON qr_scans(campagne, created_at DESC);

ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- Lecture admin uniquement (back-office)
CREATE POLICY "admin_view_qr_scans" ON qr_scans
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM utilisateurs WHERE role = 'admin')
  );
