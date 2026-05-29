-- Migration 002 — Système anti-fraude livraison + rémunération livreur
-- À exécuter dans : Supabase Dashboard > SQL Editor

-- 1. Colonnes anti-fraude et rémunération sur livraisons
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS code_confirmation  varchar(6);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS code_utilise_at    timestamptz;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS remuneration_xaf   integer DEFAULT 0;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS client_telephone   text;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS notes              text;

-- 2. Permettre au client de lire le code_confirmation de SA livraison
--    (il doit le montrer au livreur à la remise du colis)
DROP POLICY IF EXISTS "livraisons_lecture_client" ON livraisons;
CREATE POLICY "livraisons_lecture_client" ON livraisons
  FOR SELECT
  USING (
    commande_id IN (
      SELECT id FROM commandes WHERE utilisateur_id = auth.uid()
    )
  );

-- 3. Admin peut tout faire sur livraisons
DROP POLICY IF EXISTS "livraisons_admin_all" ON livraisons;
CREATE POLICY "livraisons_admin_all" ON livraisons
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM utilisateurs WHERE role = 'admin')
  );

-- 4. Colonne suspension sur utilisateurs (pour blocage par admin)
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS suspendu boolean DEFAULT false;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS motif_suspension text;

-- 5. Mettre à jour la contrainte rôle pour s'assurer que tout est bon
ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('acheteur', 'vendeur', 'livreur', 'admin'));
