-- 🔐 MIGRATION: Système d'Auth Simplifié V2
-- Pseudo + PIN + Choix récupération (Email/Phrase/Code)

-- 1️⃣ Table Utilisateurs (Nouvelle Auth)
CREATE TABLE IF NOT EXISTS utilisateurs_auth_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  pseudo VARCHAR(50) NOT NULL UNIQUE,
  pin_hash VARCHAR(255) NOT NULL,

  -- Récupération de compte
  recovery_method VARCHAR(20) NOT NULL, -- 'email' | 'phrase' | 'code'

  -- Email Recovery
  email VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,

  -- Phrase Secrète Recovery
  phrase_hash VARCHAR(255),
  phrase_first_letter VARCHAR(1),        -- Pour vérification admin
  phrase_word_count INTEGER,             -- Nombre de mots

  -- Code Récupération
  recovery_code_hash VARCHAR(255),

  -- Session & Tokens
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Flags
  actif BOOLEAN DEFAULT TRUE,

  -- Audit
  migration_from_supabase_id UUID  -- Référence à ancien auth si migration
);

-- 2️⃣ Table Recovery Attempts (Audit Trail)
CREATE TABLE IF NOT EXISTS recovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES utilisateurs_auth_v2(id) ON DELETE CASCADE,

  -- Tentatives
  action VARCHAR(50), -- 'login', 'recover_email', 'recover_phrase', 'recover_code'
  success BOOLEAN,
  attempt_count INTEGER DEFAULT 1,

  -- Détails
  recovery_method_used VARCHAR(20),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Rate limiting
  reset_at TIMESTAMP WITH TIME ZONE
);

-- 3️⃣ Table Admin Recovery Actions (Support)
CREATE TABLE IF NOT EXISTS admin_recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User & Admin
  user_id UUID NOT NULL REFERENCES utilisateurs_auth_v2(id),
  admin_id UUID, -- Admin qui a fait l'action

  -- Actions
  action VARCHAR(50), -- 'reset_pin', 'reset_phrase', 'reset_code'
  reason VARCHAR(200),

  -- Vérification
  verification_method VARCHAR(50), -- 'email_match', 'phrase_partial', 'manual'
  verification_details TEXT,

  -- Status
  status VARCHAR(20), -- 'pending', 'verified', 'completed'

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- 4️⃣ Table Support Tickets (Récupération)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,

  -- User
  user_id UUID REFERENCES utilisateurs_auth_v2(id),
  pseudo VARCHAR(50) NOT NULL,

  -- Ticket Info
  type VARCHAR(50), -- 'forgotten_phrase', 'forgotten_code', 'account_recovery'
  subject TEXT,
  description TEXT,

  -- Vérification
  email_provided VARCHAR(255),
  phrase_first_letter VARCHAR(1),
  phrase_word_count INTEGER,
  additional_info TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'pending_verification', 'resolved'

  -- Admin
  assigned_to UUID,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5️⃣ Indexes
CREATE INDEX idx_pseudo ON utilisateurs_auth_v2(pseudo);
CREATE INDEX idx_email ON utilisateurs_auth_v2(email);
CREATE INDEX idx_recovery_attempts_user ON recovery_attempts(user_id);
CREATE INDEX idx_recovery_attempts_action ON recovery_attempts(action, success);
CREATE INDEX idx_admin_actions_user ON admin_recovery_actions(user_id);
CREATE INDEX idx_admin_actions_status ON admin_recovery_actions(status);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- 6️⃣ RLS Policies
ALTER TABLE utilisateurs_auth_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Utilisateur peut voir ses propres données
CREATE POLICY "user_view_own_data" ON utilisateurs_auth_v2
  FOR SELECT USING (id = (SELECT user_id FROM current_user_session LIMIT 1));

-- Admin peut voir tous
CREATE POLICY "admin_view_all" ON admin_recovery_actions
  FOR SELECT USING (
    admin_id = (SELECT user_id FROM current_user_session LIMIT 1)
    OR EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT user_id FROM current_user_session LIMIT 1))
  );

-- 7️⃣ Functions & Procedures

-- Hash PIN (bcrypt-like)
CREATE OR REPLACE FUNCTION hash_pin(p_pin VARCHAR) RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(digest(p_pin || 'brotega_salt_2026', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify PIN
CREATE OR REPLACE FUNCTION verify_pin(p_pin VARCHAR, p_pin_hash VARCHAR) RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash_pin(p_pin) = p_pin_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate Recovery Code (12 chars)
CREATE OR REPLACE FUNCTION generate_recovery_code() RETURNS VARCHAR AS $$
BEGIN
  RETURN SUBSTRING(encode(digest(random()::text, 'sha256'), 'hex'), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- Register User
CREATE OR REPLACE FUNCTION register_user(
  p_pseudo VARCHAR,
  p_pin VARCHAR,
  p_recovery_method VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_phrase VARCHAR DEFAULT NULL,
  p_code VARCHAR DEFAULT NULL
) RETURNS TABLE (user_id UUID, recovery_code VARCHAR) AS $$
DECLARE
  v_user_id UUID;
  v_recovery_code VARCHAR;
  v_phrase_hash VARCHAR;
  v_phrase_first_letter VARCHAR;
  v_phrase_word_count INTEGER;
BEGIN
  -- Check pseudo exists
  IF EXISTS (SELECT 1 FROM utilisateurs_auth_v2 WHERE pseudo = p_pseudo) THEN
    RAISE EXCEPTION 'Pseudo already taken';
  END IF;

  -- Generate recovery code for all methods
  v_recovery_code := generate_recovery_code();

  -- Process phrase if needed
  IF p_recovery_method = 'phrase' AND p_phrase IS NOT NULL THEN
    v_phrase_hash := encode(digest(p_phrase, 'sha256'), 'hex');
    v_phrase_first_letter := LEFT(p_phrase, 1);
    v_phrase_word_count := array_length(string_to_array(trim(p_phrase), ' '), 1);
  END IF;

  -- Insert user
  INSERT INTO utilisateurs_auth_v2 (
    pseudo, pin_hash, recovery_method, email, email_verified,
    phrase_hash, phrase_first_letter, phrase_word_count, recovery_code_hash
  ) VALUES (
    p_pseudo,
    hash_pin(p_pin),
    p_recovery_method,
    p_email,
    CASE WHEN p_recovery_method = 'email' THEN FALSE ELSE NULL END,
    v_phrase_hash,
    v_phrase_first_letter,
    v_phrase_word_count,
    encode(digest(v_recovery_code, 'sha256'), 'hex')
  ) RETURNING id INTO v_user_id;

  RETURN QUERY SELECT v_user_id, v_recovery_code;
END;
$$ LANGUAGE plpgsql;

-- Login
CREATE OR REPLACE FUNCTION login_user(p_pseudo VARCHAR, p_pin VARCHAR)
RETURNS TABLE (user_id UUID, success BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_pin_hash VARCHAR;
BEGIN
  SELECT id, pin_hash INTO v_user_id, v_pin_hash
  FROM utilisateurs_auth_v2
  WHERE pseudo = p_pseudo AND actif = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  IF verify_pin(p_pin, v_pin_hash) THEN
    UPDATE utilisateurs_auth_v2 SET last_login_at = NOW() WHERE id = v_user_id;
    RETURN QUERY SELECT v_user_id, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::UUID, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8️⃣ Session Storage (Temporary)
-- Pour stocker les JWT sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES utilisateurs_auth_v2(id) ON DELETE CASCADE,

  token_hash VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,

  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions() RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ✅ Fin migration
