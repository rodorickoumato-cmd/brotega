-- ─── Log d'audit (Phase 4 — Admin Center) ────────────────────────────────────
-- Traçabilité qui/quoi/quand/avant/après sur les actions admin critiques.
-- Couvre notamment l'historique des modifications de commission, reporté
-- depuis la Phase 3 car il dépendait exactement de cette table.

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES auth.users(id),
  action      TEXT        NOT NULL,  -- ex: 'config.taux_commission', 'vendeur.statut', 'coupon.creer'
  cible_type  TEXT,                   -- ex: 'config', 'vendeur', 'coupon', 'retrait', 'produit', 'pvit_config'
  cible_id    TEXT,                   -- id ou clé de la cible (texte : les clés de config ne sont pas des UUID)
  avant       JSONB,
  apres       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy : lecture/écriture service_role uniquement (admin).
-- Écrit uniquement via enregistrerAudit() (src/lib/audit.ts) — jamais depuis
-- le client, et jamais bloquant : un échec d'écriture ne doit jamais faire
-- échouer l'action admin qu'il trace.

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
