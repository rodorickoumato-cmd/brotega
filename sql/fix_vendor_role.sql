-- ============================================================
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Fonction pour promouvoir un utilisateur au rôle vendeur
--    SECURITY DEFINER = contourne RLS, pas besoin de service_role key
CREATE OR REPLACE FUNCTION promouvoir_vendeur()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE utilisateurs SET role = 'vendeur' WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION promouvoir_vendeur() TO authenticated;

-- 2. Trigger pour créer automatiquement le wallet dès qu'un vendeur est inséré
--    Évite de dépendre du client admin pour cette opération
CREATE OR REPLACE FUNCTION creer_wallet_vendeur()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (vendeur_id, balance_available_xaf, balance_pending_xaf)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (vendeur_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_creer_wallet ON vendeurs;
CREATE TRIGGER trig_creer_wallet
  AFTER INSERT ON vendeurs
  FOR EACH ROW
  EXECUTE FUNCTION creer_wallet_vendeur();
