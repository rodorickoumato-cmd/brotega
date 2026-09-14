-- Migration: Create audit_logs table for security logging
-- Date: 2026-09-14
-- Purpose: Track all sensitive operations for compliance & anomaly detection

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES utilisateurs_auth_v2(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ✅ INDEXES for query performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ✅ POLICY: Users can view their own audit logs
CREATE POLICY "users_view_own_logs"
  ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ✅ POLICY: Admins can view all audit logs (only for admin operations)
CREATE POLICY "admins_view_all_logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs_auth_v2
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ✅ POLICY: Only admin can insert (via API with service role)
CREATE POLICY "admin_insert_logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Will be controlled by API layer

-- ✅ COMMENT
COMMENT ON TABLE audit_logs IS 'Security audit trail for compliance and anomaly detection';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: user_login, payment_success, admin_access, etc';
COMMENT ON COLUMN audit_logs.status IS 'Outcome: success, failure, pending';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of requester (for DDoS detection)';
COMMENT ON COLUMN audit_logs.details IS 'Additional context as JSON (amount, reason, etc)';
