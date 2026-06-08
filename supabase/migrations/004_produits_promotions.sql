-- Migration 004 : Promotions produits
-- Idempotente

ALTER TABLE produits ADD COLUMN IF NOT EXISTS prix_promo  integer;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS promo_actif boolean NOT NULL DEFAULT false;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS promo_fin   timestamptz;
