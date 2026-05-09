-- Migration 001 — Ajout du rôle livreur
-- À exécuter dans : Supabase Dashboard > SQL Editor

-- 1. Mettre à jour la contrainte CHECK sur le rôle
ALTER TABLE utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

ALTER TABLE utilisateurs
  ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('acheteur', 'vendeur', 'livreur', 'admin'));

-- 2. Ajouter la colonne livreur_id sur les commandes (assignation de livraison)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS livreur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commandes_livreur ON commandes(livreur_id);

-- 3. RLS : livreur voit uniquement ses commandes assignées
CREATE POLICY "commandes_lecture_livreur"
  ON commandes FOR SELECT
  USING (
    livreur_id = auth.uid()
    OR utilisateur_id = auth.uid()
    OR vendeur_id IN (
      SELECT id FROM vendeurs WHERE utilisateur_id = auth.uid()
    )
  );

-- 4. Livreur peut mettre à jour le statut de ses commandes assignées
CREATE POLICY "commandes_update_livreur"
  ON commandes FOR UPDATE
  USING (livreur_id = auth.uid())
  WITH CHECK (livreur_id = auth.uid());
