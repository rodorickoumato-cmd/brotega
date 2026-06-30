-- ─── Configuration dynamique de l'application ──────────────────────────────
-- Permet à l'admin de modifier les paramètres sans redéploiement.

CREATE TABLE IF NOT EXISTS app_config (
  cle         TEXT        PRIMARY KEY,
  valeur      JSONB       NOT NULL,
  description TEXT,
  categorie   TEXT        NOT NULL DEFAULT 'general',
  modifie_le  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_par UUID        REFERENCES auth.users(id)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les prix des plans doivent être lisibles côté client)
CREATE POLICY "lecture_app_config" ON app_config
  FOR SELECT USING (true);

-- Écriture : admins uniquement via service_role (server-side)
-- Pas de policy INSERT/UPDATE/DELETE en RLS → les writes passent par le client admin (service_role bypass RLS)

-- ─── Valeurs initiales (idempotentes) ───────────────────────────────────────
INSERT INTO app_config (cle, valeur, description, categorie) VALUES
  ('plans_prix',
   '{"mensuel": 2000, "trimestriel": 5000, "semestriel": 8000, "annuel": 15000}',
   'Prix des plans d''abonnement en XAF',
   'abonnements'),
  ('max_produits_gratuit',
   '3',
   'Nombre maximum de produits visibles pour le plan gratuit',
   'abonnements'),
  ('taux_commission',
   '0',
   'Commission prélevée sur chaque vente (0.05 = 5%). Actuellement 0.',
   'commissions'),
  ('frais_mobile_money_taux',
   '0.03',
   'Frais de traitement Mobile Money facturés au client (0.03 = 3%)',
   'paiements'),
  ('airtel_money_actif',
   'true',
   'Activer ou désactiver le paiement Airtel Money',
   'paiements'),
  ('moov_money_actif',
   'true',
   'Activer ou désactiver le paiement Moov Money',
   'paiements'),
  ('jours_auto_liberation_escrow',
   '7',
   'Délai en jours avant libération automatique de l''escrow vers le vendeur',
   'livraison'),
  ('retrait_min_xaf',
   '5000',
   'Montant minimum qu''un vendeur peut retirer de son wallet',
   'wallet'),
  ('max_retraits_par_jour',
   '1',
   'Nombre maximum de demandes de retrait par vendeur par jour',
   'wallet')
ON CONFLICT (cle) DO NOTHING;
