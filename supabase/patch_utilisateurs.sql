-- ============================================================
-- PATCH — Colonnes manquantes dans utilisateurs
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS email_verifie   BOOLEAN DEFAULT FALSE;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS whatsapp        TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();
