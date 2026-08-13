-- ─── Comptes marchands PVIT par opérateur ───────────────────────────────────
-- Jusqu'ici merchant_operation_account_code était UNIQUE (PVIT_ACCOUNT_CODE en
-- env var), partagé entre Airtel Money et Moov Money, et non modifiable sans
-- redéploiement. Cette table permet à l'admin de gérer un code de compte
-- distinct par opérateur, sans redéploiement.
--
-- Table séparée de app_config (volontairement) : app_config a une policy de
-- lecture publique (`USING (true)`) car elle porte des réglages affichés côté
-- client (prix, bannière...). Un code de compte marchand n'a rien à y faire.

CREATE TABLE IF NOT EXISTS pvit_config (
  operateur    TEXT        PRIMARY KEY CHECK (operateur IN ('airtel', 'moov')),
  account_code TEXT        NOT NULL DEFAULT '',
  modifie_le   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_par  UUID        REFERENCES auth.users(id)
);

ALTER TABLE pvit_config ENABLE ROW LEVEL SECURITY;
-- Aucune policy créée intentionnellement : par défaut RLS bloque tout accès
-- via les clés anon/authenticated. Seul le client service_role (createAdminClient,
-- serveur uniquement) peut lire/écrire, en bypassant RLS.

INSERT INTO pvit_config (operateur, account_code) VALUES
  ('airtel', ''),
  ('moov', '')
ON CONFLICT (operateur) DO NOTHING;
