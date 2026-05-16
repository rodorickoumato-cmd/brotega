-- ============================================================
-- PATCH — Colonnes manquantes + trigger nb_produits
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- (si la DB est déjà créée avec l'ancien schema.sql)
-- ============================================================

-- ── 1. Colonnes manquantes dans produits ─────────────────────
ALTER TABLE produits ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS categorie   TEXT;

-- ── 2. Trigger nb_produits ───────────────────────────────────
CREATE OR REPLACE FUNCTION sync_nb_produits()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vendeurs SET nb_produits = nb_produits + 1 WHERE id = NEW.vendeur_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vendeurs SET nb_produits = GREATEST(nb_produits - 1, 0) WHERE id = OLD.vendeur_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_produits_nb ON produits;
CREATE TRIGGER trg_produits_nb
AFTER INSERT OR DELETE ON produits
FOR EACH ROW EXECUTE FUNCTION sync_nb_produits();

-- ── 3. Recalcul du compteur existant (si des produits existent déjà) ─
UPDATE vendeurs v
SET nb_produits = (
  SELECT COUNT(*) FROM produits p WHERE p.vendeur_id = v.id
);
