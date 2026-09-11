-- 🚀 MIGRATION: Commission par Article System (Sans Limites)
-- Remplace le système de limites d'articles par un système de commission configurable

-- 1️⃣ Paramètres de commission par vendeur
CREATE TABLE IF NOT EXISTS vendor_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id UUID NOT NULL REFERENCES vendeurs(id) ON DELETE CASCADE,

  -- Commission par défaut pour les nouveaux produits
  commission_defaut DECIMAL(4,2) DEFAULT 0.05,

  -- Plages acceptées
  commission_min DECIMAL(4,2) DEFAULT 0.02,
  commission_max DECIMAL(4,2) DEFAULT 0.15,

  -- Actif / Inactif
  actif BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte d'unicité : un vendeur = une config
  UNIQUE(vendeur_id)
);

-- 2️⃣ Commission spécifique par article (override de la défaut)
CREATE TABLE IF NOT EXISTS produit_commission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  vendeur_id UUID NOT NULL REFERENCES vendeurs(id) ON DELETE CASCADE,

  -- Commission spécifique (override la défaut)
  commission DECIMAL(4,2) NOT NULL,

  -- Contexte / Raison (optional)
  raison VARCHAR(150),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un article = une commission custom
  UNIQUE(produit_id),

  -- Vérification : commission valide
  CONSTRAINT commission_valide CHECK (commission >= 0.02 AND commission <= 0.15)
);

-- 3️⃣ Historique audit des changements de commission
CREATE TABLE IF NOT EXISTS commission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id UUID NOT NULL REFERENCES vendeurs(id),
  produit_id UUID REFERENCES produits(id),

  -- Avant / Après
  commission_ancien DECIMAL(4,2),
  commission_nouveau DECIMAL(4,2) NOT NULL,

  -- Contexte
  raison VARCHAR(200),
  change_type VARCHAR(50), -- 'defaut_update' | 'custom_create' | 'custom_update' | 'custom_reset'

  -- Qui a changé (admin = NULL, vendeur = vendeur_id)
  changed_by_vendeur_id UUID,
  changed_by_admin_id UUID,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ Ajouter colonne commission aux commandes (snapshot du moment de la commande)
ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(4,2) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS commission_montant_xaf INTEGER DEFAULT 0;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_vendor_commission_settings_vendeur ON vendor_commission_settings(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_produit_commission_vendeur ON produit_commission(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_vendeur ON commission_history(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_produit ON commission_history(produit_id);
CREATE INDEX IF NOT EXISTS idx_commandes_commission ON commandes(commission_percent);

-- 5️⃣ RLS Policies : Vendeur ne peut voir/modifier que sa propre config
ALTER TABLE vendor_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendeur peut voir sa config de commission" ON vendor_commission_settings
  FOR SELECT USING (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Vendeur peut modifier sa config de commission" ON vendor_commission_settings
  FOR UPDATE USING (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    )
  ) WITH CHECK (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    ) AND
    commission_defaut >= 0.02 AND commission_defaut <= 0.15
  );

-- 6️⃣ RLS : produit_commission (vendeur ne peut voir que ses produits)
ALTER TABLE produit_commission ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendeur peut voir commission de ses produits" ON produit_commission
  FOR SELECT USING (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Vendeur peut modifier commission de ses produits" ON produit_commission
  FOR ALL USING (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    )
  ) WITH CHECK (
    vendeur_id = (
      SELECT id FROM vendeurs
      WHERE utilisateur_id = auth.uid()
      LIMIT 1
    ) AND
    commission >= 0.02 AND commission <= 0.15
  );

-- 7️⃣ Fonction : Récupérer la commission effective d'un produit
CREATE OR REPLACE FUNCTION get_commission_produit(
  p_produit_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_commission DECIMAL;
  v_vendeur_id UUID;
BEGIN
  -- Récupère le vendeur du produit
  SELECT vendeur_id INTO v_vendeur_id
  FROM produits
  WHERE id = p_produit_id;

  -- Cherche une commission custom
  SELECT commission INTO v_commission
  FROM produit_commission
  WHERE produit_id = p_produit_id;

  -- Si custom existe, la retourner
  IF v_commission IS NOT NULL THEN
    RETURN v_commission;
  END IF;

  -- Sinon, retourner la commission par défaut du vendeur
  SELECT commission_defaut INTO v_commission
  FROM vendor_commission_settings
  WHERE vendeur_id = v_vendeur_id;

  -- Fallback 5% si rien trouvé
  RETURN COALESCE(v_commission, 0.05);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8️⃣ Fonction : Initialiser la config commission pour un nouveau vendeur
CREATE OR REPLACE FUNCTION init_commission_settings_for_vendor(
  p_vendeur_id UUID,
  p_plan VARCHAR DEFAULT 'gratuit'
) RETURNS void AS $$
BEGIN
  INSERT INTO vendor_commission_settings (vendeur_id, commission_defaut)
  VALUES (
    p_vendeur_id,
    CASE
      WHEN p_plan = 'gratuit' THEN 0.05
      ELSE 0.03
    END
  )
  ON CONFLICT (vendeur_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 9️⃣ Trigger : Auto-initialiser commission settings quand vendeur créé
CREATE OR REPLACE FUNCTION trigger_init_commission_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupère le plan actuel du vendeur
  PERFORM init_commission_settings_for_vendor(NEW.id, 'gratuit');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_commission_settings ON vendeurs;

CREATE TRIGGER trg_init_commission_settings
AFTER INSERT ON vendeurs
FOR EACH ROW
EXECUTE FUNCTION trigger_init_commission_settings();

-- Initialiser tous les vendeurs existants (migration safe)
DO $$
BEGIN
  INSERT INTO vendor_commission_settings (vendeur_id, commission_defaut)
  SELECT v.id, 0.05 FROM vendeurs v
  WHERE NOT EXISTS (
    SELECT 1 FROM vendor_commission_settings vcs
    WHERE vcs.vendeur_id = v.id
  )
  ON CONFLICT (vendeur_id) DO NOTHING;
END $$;

-- ✅ Fin migration
