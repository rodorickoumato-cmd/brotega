-- Migration 002 — Création table livraisons + système anti-fraude + rémunération livreur
-- Exécutée le 2026-05-29 dans Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS livraisons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id        uuid NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  livreur_id         uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut             text NOT NULL DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente','assignee','en_route','livree','echec')),
  note_livreur       text,
  code_confirmation  varchar(6),
  code_utilise_at    timestamptz,
  remuneration_xaf   integer DEFAULT 0,
  client_telephone   text,
  notes              text,
  assignee_at        timestamptz,
  livree_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE livraisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "livraisons_lecture_livreur" ON livraisons;
CREATE POLICY "livraisons_lecture_livreur" ON livraisons
  FOR SELECT USING (livreur_id = auth.uid());

DROP POLICY IF EXISTS "livraisons_update_livreur" ON livraisons;
CREATE POLICY "livraisons_update_livreur" ON livraisons
  FOR UPDATE USING (livreur_id = auth.uid());

DROP POLICY IF EXISTS "livraisons_lecture_client" ON livraisons;
CREATE POLICY "livraisons_lecture_client" ON livraisons
  FOR SELECT
  USING (
    commande_id IN (
      SELECT id FROM commandes WHERE utilisateur_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "livraisons_admin_all" ON livraisons;
CREATE POLICY "livraisons_admin_all" ON livraisons
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM utilisateurs WHERE role = 'admin')
  );

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS suspendu boolean DEFAULT false;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS motif_suspension text;

ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('acheteur', 'vendeur', 'livreur', 'admin'));
