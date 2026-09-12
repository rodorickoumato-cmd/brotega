-- Migration: Add QR code and delivery proof (photo) to livraisons

-- 1️⃣ Add QR code fields
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS qr_code_content VARCHAR(500); -- Content of QR (usually the confirmation code)
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP WITH TIME ZONE;

-- 2️⃣ Add delivery proof (photo)
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS proof_photo_url TEXT; -- Photo URL (Cloudinary)
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS proof_photo_taken_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS proof_notes TEXT; -- Notes from livreur about delivery

-- 3️⃣ Create delivery_photos table for multiple photos per delivery
CREATE TABLE IF NOT EXISTS delivery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livraison_id UUID NOT NULL REFERENCES livraisons(id) ON DELETE CASCADE,

  -- Photo metadata
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50), -- 'before', 'delivery', 'signature', 'damage', etc.
  description TEXT,

  -- Timestamp
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Verification
  verified_by_admin BOOLEAN DEFAULT FALSE,
  verification_notes TEXT
);

-- 4️⃣ Indexes for performance
CREATE INDEX idx_delivery_photos_livraison ON delivery_photos(livraison_id);
CREATE INDEX idx_delivery_photos_type ON delivery_photos(photo_type);
CREATE INDEX idx_livraisons_proof ON livraisons(proof_photo_url) WHERE proof_photo_url IS NOT NULL;

-- 5️⃣ RLS for delivery_photos
ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;

-- Livreur can see their own photos
CREATE POLICY "livreur_view_own_photos" ON delivery_photos
  FOR SELECT USING (
    livraison_id IN (
      SELECT id FROM livraisons WHERE livreur_id = auth.uid()
    )
  );

-- Livreur can upload photos
CREATE POLICY "livreur_insert_photos" ON delivery_photos
  FOR INSERT WITH CHECK (
    livraison_id IN (
      SELECT id FROM livraisons WHERE livreur_id = auth.uid()
    )
  );

-- Vendeur can see photos for their deliveries
CREATE POLICY "vendeur_view_photos" ON delivery_photos
  FOR SELECT USING (
    livraison_id IN (
      SELECT l.id FROM livraisons l
      JOIN commandes c ON l.commande_id = c.id
      WHERE c.vendeur_id = auth.uid()
    )
  );

-- Client can see photos for their delivery
CREATE POLICY "client_view_photos" ON delivery_photos
  FOR SELECT USING (
    livraison_id IN (
      SELECT l.id FROM livraisons l
      JOIN commandes c ON l.commande_id = c.id
      WHERE c.utilisateur_id = auth.uid()
    )
  );

-- Admin can see all
CREATE POLICY "admin_view_all_photos" ON delivery_photos
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilisateurs WHERE role = 'admin')
  );

-- ✅ Migration complete
