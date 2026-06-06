-- Migration 003 : Réclamations — création table + contraintes + policies
-- Idempotente (safe à relancer si la table existe déjà)
-- Date : 2026-05-31

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS reclamations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id     uuid NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  utilisateur_id  uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  motif           text NOT NULL,
  statut          text NOT NULL DEFAULT 'ouverte'
                  CHECK (statut IN ('ouverte','en_cours','resolue_acheteur','resolue_vendeur','fermee')),
  resolution      text,
  admin_id        uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  resolue_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Contrainte motif : entre 10 et 5000 caractères
ALTER TABLE reclamations DROP CONSTRAINT IF EXISTS reclamations_motif_check;
ALTER TABLE reclamations ADD CONSTRAINT reclamations_motif_check
  CHECK (char_length(motif) BETWEEN 10 AND 5000);

-- 3. Activer RLS
ALTER TABLE reclamations ENABLE ROW LEVEL SECURITY;

-- 4. Client : lire ses propres réclamations
DROP POLICY IF EXISTS "reclam_select_client" ON reclamations;
CREATE POLICY "reclam_select_client" ON reclamations FOR SELECT
  USING (utilisateur_id = auth.uid());

-- 5. Client : insérer une réclamation
DROP POLICY IF EXISTS "reclam_insert_client" ON reclamations;
CREATE POLICY "reclam_insert_client" ON reclamations FOR INSERT
  WITH CHECK (utilisateur_id = auth.uid());

-- 6. Admin : lire toutes les réclamations
DROP POLICY IF EXISTS "reclam_select_admin" ON reclamations;
CREATE POLICY "reclam_select_admin" ON reclamations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Admin : mettre à jour (résoudre)
DROP POLICY IF EXISTS "reclam_update_admin" ON reclamations;
CREATE POLICY "reclam_update_admin" ON reclamations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
