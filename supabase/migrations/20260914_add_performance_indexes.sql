-- Migration: Add performance indexes
-- Date: 2026-09-14
-- Purpose: Optimize query performance on critical tables

-- ✅ PRODUCTS TABLE
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ✅ ORDERS TABLE
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);

-- ✅ LIVRAISONS/DELIVERIES TABLE
CREATE INDEX IF NOT EXISTS idx_livraisons_driver_id ON livraisons(driver_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_order_id ON livraisons(order_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_status ON livraisons(status);
CREATE INDEX IF NOT EXISTS idx_livraisons_created_at ON livraisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livraisons_driver_status ON livraisons(driver_id, status);

-- ✅ MESSAGES TABLE
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ✅ DELIVERY PHOTOS TABLE
CREATE INDEX IF NOT EXISTS idx_delivery_photos_livraison_id ON delivery_photos(livraison_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_verified ON delivery_photos(verified);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_uploaded_at ON delivery_photos(uploaded_at DESC);

-- ✅ AUDIT LOGS TABLE (already has indexes from migration)
-- Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ✅ AUTH TABLE
CREATE INDEX IF NOT EXISTS idx_utilisateurs_auth_v2_pseudo ON utilisateurs_auth_v2(pseudo);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_auth_v2_email ON utilisateurs_auth_v2(email);

-- ✅ COMMENTS
COMMENT ON INDEX idx_products_vendor_id IS 'Speed up queries: SELECT * FROM products WHERE vendor_id = ?';
COMMENT ON INDEX idx_orders_client_status IS 'Speed up: SELECT * FROM orders WHERE client_id = ? AND status = ?';
COMMENT ON INDEX idx_livraisons_driver_status IS 'Speed up: SELECT * FROM livraisons WHERE driver_id = ? AND status = ?';
