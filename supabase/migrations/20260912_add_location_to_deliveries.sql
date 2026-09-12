-- Migration: Add geolocation and detailed address to livraisons table

-- 1️⃣ Add location fields to livraisons
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS client_address_full TEXT; -- Complete address
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS client_ville VARCHAR(100);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS client_quartier VARCHAR(100);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS client_details TEXT; -- Instructions (étage, portail, etc.)
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2️⃣ Add livreur location tracking (real-time)
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS livreur_latitude DECIMAL(10, 8);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS livreur_longitude DECIMAL(11, 8);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS livreur_location_updated_at TIMESTAMP WITH TIME ZONE;

-- 3️⃣ Add distance tracking
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6, 2);
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS estimated_arrival_at TIMESTAMP WITH TIME ZONE;

-- 4️⃣ Create delivery tracking history table
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livraison_id UUID NOT NULL REFERENCES livraisons(id) ON DELETE CASCADE,

  -- Location snapshot
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  accuracy_meters INTEGER,
  speed_kmh DECIMAL(5, 2)
);

-- 5️⃣ Indexes for performance
CREATE INDEX idx_delivery_tracking_livraison ON delivery_tracking(livraison_id);
CREATE INDEX idx_delivery_tracking_recorded_at ON delivery_tracking(recorded_at);
CREATE INDEX idx_livraisons_location ON livraisons(latitude, longitude) WHERE latitude IS NOT NULL;

-- 6️⃣ RLS for delivery tracking
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Livreur can see their own tracking
CREATE POLICY "livreur_view_own_tracking" ON delivery_tracking
  FOR SELECT USING (
    livraison_id IN (
      SELECT id FROM livraisons WHERE livreur_id = auth.uid()
    )
  );

-- Client can see tracking for their delivery
CREATE POLICY "client_view_own_tracking" ON delivery_tracking
  FOR SELECT USING (
    livraison_id IN (
      SELECT l.id FROM livraisons l
      JOIN commandes c ON l.commande_id = c.id
      WHERE c.utilisateur_id = auth.uid()
    )
  );

-- Admin can see all tracking
CREATE POLICY "admin_view_all_tracking" ON delivery_tracking
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilisateurs WHERE role = 'admin')
  );

-- ✅ Migration complete
