-- Migration: Add role field to utilisateurs_auth_v2

-- 1️⃣ Add role column
ALTER TABLE utilisateurs_auth_v2 ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';

-- 2️⃣ Add role index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_v2_role ON utilisateurs_auth_v2(role);

-- 3️⃣ Create profile table for additional user info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES utilisateurs_auth_v2(id) ON DELETE CASCADE,

  -- Full name
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Contact
  phone VARCHAR(20),
  country VARCHAR(2),
  city VARCHAR(100),

  -- Business (for vendors/drivers)
  business_name VARCHAR(200),
  business_registration VARCHAR(100),

  -- Profile picture
  avatar_url TEXT,

  -- Verification
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON user_profiles(email_verified);

-- 5️⃣ RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_profile" ON user_profiles
  FOR SELECT USING (id = (SELECT auth_id FROM current_user_session LIMIT 1) OR auth.uid() = id);

CREATE POLICY "user_update_own_profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- ✅ Migration complete
