-- ─── Suivi des retraits vendeurs (Phase 3 — Admin Center) ───────────────────
-- Gap réel trouvé en code : demanderRetrait() débite le wallet du vendeur
-- IMMÉDIATEMENT (via debiter_wallet_retrait), mais le virement Mobile Money
-- est fait manuellement par l'admin (TODO PawaPay jamais branché). Jusqu'ici
-- rien ne trace "quels retraits restent à payer" — juste une ligne parmi
-- toutes les wallet_transactions, invisible pour l'admin. Un vendeur peut
-- attendre son argent indéfiniment sans que personne ne le remarque.
--
-- Ne change PAS le moment du débit (décision hors scope ici) : ajoute juste
-- la visibilité et une capacité de correction (rejet + recrédit) qui
-- manquaient. Miroir du pattern déjà en place pour payer les livreurs
-- (/admin/livreurs, remuneration_versee).

CREATE TABLE IF NOT EXISTS retraits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id   UUID        NOT NULL REFERENCES vendeurs(id),
  montant_xaf  INTEGER     NOT NULL,
  telephone    TEXT        NOT NULL,
  provider     TEXT        NOT NULL CHECK (provider IN ('airtel', 'moov')),
  statut       TEXT        NOT NULL DEFAULT 'a_payer' CHECK (statut IN ('a_payer', 'paye', 'rejete')),
  motif_rejet  TEXT,
  paye_par     UUID        REFERENCES auth.users(id),
  paye_le      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE retraits ENABLE ROW LEVEL SECURITY;
-- Aucune policy : lecture/écriture service_role uniquement (admin + RPC).

-- La signature change (ajout téléphone/opérateur) : on retire l'ancienne
-- version pour éviter une fonction fantôme à 3 arguments à côté de la
-- nouvelle à 5 arguments.
DROP FUNCTION IF EXISTS debiter_wallet_retrait(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION debiter_wallet_retrait(
  p_vendeur_id  UUID,
  p_montant     INTEGER,
  p_description TEXT,
  p_telephone   TEXT,
  p_provider    TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solde_available INTEGER;
  v_solde_pending   INTEGER;
  v_nb_retraits     BIGINT;
  v_retrait_id      UUID;
BEGIN
  SELECT balance_available_xaf, balance_pending_xaf
  INTO   v_solde_available, v_solde_pending
  FROM   wallets
  WHERE  vendeur_id = p_vendeur_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Wallet introuvable');
  END IF;

  IF v_solde_available < p_montant THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Solde disponible insuffisant.');
  END IF;

  SELECT COUNT(*) INTO v_nb_retraits
  FROM   wallet_transactions
  WHERE  vendeur_id = p_vendeur_id
    AND  type       = 'retrait'
    AND  created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF v_nb_retraits >= 1 THEN
    RETURN jsonb_build_object(
      'succes', false,
      'erreur', 'Limite atteinte : 1 retrait par jour. Réessayez demain.'
    );
  END IF;

  UPDATE wallets
  SET    balance_available_xaf = balance_available_xaf - p_montant
  WHERE  vendeur_id = p_vendeur_id;

  INSERT INTO wallet_transactions(
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres, description
  ) VALUES (
    p_vendeur_id, 'retrait', -p_montant,
    v_solde_pending, v_solde_available - p_montant, p_description
  );

  INSERT INTO retraits (vendeur_id, montant_xaf, telephone, provider)
  VALUES (p_vendeur_id, p_montant, p_telephone, p_provider)
  RETURNING id INTO v_retrait_id;

  RETURN jsonb_build_object('succes', true, 'retrait_id', v_retrait_id);
END;
$$;

-- Rejet d'un retrait : recrédite le vendeur (ajustement traçable) et marque
-- le retrait comme rejeté. Atomique pour éviter un recrédit orphelin si
-- l'update du retrait échouait après coup.
CREATE OR REPLACE FUNCTION rejeter_retrait(
  p_retrait_id UUID,
  p_admin_id   UUID,
  p_motif      TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_retrait RECORD;
  v_solde_available INTEGER;
  v_solde_pending   INTEGER;
BEGIN
  SELECT * INTO v_retrait FROM retraits WHERE id = p_retrait_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Retrait introuvable');
  END IF;
  IF v_retrait.statut <> 'a_payer' THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Ce retrait a déjà été traité.');
  END IF;

  SELECT balance_available_xaf, balance_pending_xaf
  INTO   v_solde_available, v_solde_pending
  FROM   wallets
  WHERE  vendeur_id = v_retrait.vendeur_id
  FOR    UPDATE;

  UPDATE wallets
  SET    balance_available_xaf = balance_available_xaf + v_retrait.montant_xaf
  WHERE  vendeur_id = v_retrait.vendeur_id;

  INSERT INTO wallet_transactions(
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres, description
  ) VALUES (
    v_retrait.vendeur_id, 'ajustement', v_retrait.montant_xaf,
    v_solde_pending, v_solde_available + v_retrait.montant_xaf,
    'Retrait rejeté — recrédit : ' || COALESCE(p_motif, 'sans motif')
  );

  UPDATE retraits
  SET statut = 'rejete', motif_rejet = p_motif, paye_par = p_admin_id, paye_le = NOW()
  WHERE id = p_retrait_id;

  RETURN jsonb_build_object('succes', true);
END;
$$;
