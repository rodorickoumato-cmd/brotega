-- ============================================================
-- SECURITY PATCHES — MYC'S SECRET
-- À coller dans l'éditeur SQL Supabase et exécuter une seule fois.
-- Toutes les opérations sont idempotentes (CREATE OR REPLACE).
-- ============================================================

-- ─── 1. Débit wallet atomique + vérification limite retrait ──
-- Remplace le pattern non-atomique lire-puis-écrire en TypeScript.
-- Verrouille la ligne wallet (FOR UPDATE) avant de débiter
-- pour éviter les doubles retraits concurrents.
CREATE OR REPLACE FUNCTION debiter_wallet_retrait(
  p_vendeur_id  UUID,
  p_montant     INTEGER,
  p_description TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solde_available INTEGER;
  v_solde_pending   INTEGER;
  v_nb_retraits     BIGINT;
BEGIN
  -- Verrou exclusif sur la ligne wallet (sérialise les retraits concurrents)
  SELECT balance_available_xaf, balance_pending_xaf
  INTO   v_solde_available, v_solde_pending
  FROM   wallets
  WHERE  vendeur_id = p_vendeur_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Wallet introuvable');
  END IF;

  -- Vérification solde
  IF v_solde_available < p_montant THEN
    RETURN jsonb_build_object('succes', false, 'erreur', 'Solde disponible insuffisant.');
  END IF;

  -- Vérification limite journalière (1 retrait/jour UTC)
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

  -- Débit atomique
  UPDATE wallets
  SET    balance_available_xaf = balance_available_xaf - p_montant
  WHERE  vendeur_id = p_vendeur_id;

  -- Trace de transaction
  INSERT INTO wallet_transactions(
    vendeur_id, type, montant_xaf,
    solde_pending_apres, solde_available_apres, description
  ) VALUES (
    p_vendeur_id, 'retrait', -p_montant,
    v_solde_pending, v_solde_available - p_montant, p_description
  );

  RETURN jsonb_build_object('succes', true);
END;
$$;

-- ─── 2. Insertion produit atomique avec vérification de limite ─
-- Utilise un verrou consultatif par vendeur pour sérialiser les
-- insertions concurrentes et éviter le dépassement de quota.
CREATE OR REPLACE FUNCTION inserer_produit_si_limite_ok(
  p_vendeur_id  UUID,
  p_max         INTEGER,
  p_nom         TEXT,
  p_description TEXT,
  p_prix        NUMERIC,
  p_categorie   TEXT,
  p_image       TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nb BIGINT;
  v_id UUID;
BEGIN
  -- Verrou consultatif par vendeur (sérialise les créations concurrentes)
  PERFORM pg_advisory_xact_lock(('x' || substring(md5(p_vendeur_id::text), 1, 16))::bit(64)::bigint);

  -- Compte réel des produits (contourne nb_produits mis en cache)
  SELECT COUNT(*) INTO v_nb
  FROM   produits
  WHERE  vendeur_id = p_vendeur_id;

  IF v_nb >= p_max THEN
    RETURN jsonb_build_object(
      'succes', false,
      'erreur', format('Limite atteinte (%s produits). Passez à un plan supérieur.', p_max)
    );
  END IF;

  -- Insertion dans la table produits
  INSERT INTO produits(vendeur_id, nom, description, prix, categorie, image)
  VALUES (p_vendeur_id, p_nom, p_description, p_prix, p_categorie, p_image)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('succes', true, 'id', v_id);
END;
$$;
