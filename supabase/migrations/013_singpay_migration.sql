-- ─── Migration PVIT → Singpay ──────────────────────────────────────────────
-- PVIT platform replaced with Singpay for simpler onboarding.
--
-- Changes:
-- 1. pvit_config table is now deprecated (kept for audit history only)
-- 2. Singpay credentials now managed via environment variables:
--    - SINGPAY_BASE_URL
--    - SINGPAY_MERCHANT_ID
--    - SINGPAY_API_KEY (Bearer token)
--    - SINGPAY_SECRET_KEY (HMAC-SHA256)
--    - SINGPAY_WEBHOOK_URL
--
-- 3. No admin UI for Singpay config (credentials in env, not in DB)
-- 4. Webhook handler remains generic in /api/webhooks/paiements
-- 5. Payment provider factory selects via PAYMENT_PROVIDER env var

COMMENT ON TABLE pvit_config IS 'DEPRECATED: Kept for audit history only. PVIT replaced by Singpay (credentials in env vars). See audit_log for historical changes.';

-- No structural changes needed — table remains for audit trail compatibility
