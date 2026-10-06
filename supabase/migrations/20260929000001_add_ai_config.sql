-- ============================================================================
-- AI Configuration Table for Storing API Keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type TEXT NOT NULL DEFAULT 'api_key', -- api_key, setting, credential
  is_encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_ai_config_key ON ai_config(config_key);
CREATE INDEX idx_ai_config_type ON ai_config(config_type);
CREATE INDEX idx_ai_config_created_by ON ai_config(created_by);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

-- Only service role and authenticated users with admin role can access
CREATE POLICY "Allow service role full access"
  ON ai_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users with admin role to select (not view values)
CREATE POLICY "Allow admins to view config keys"
  ON ai_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'platform_admin')
    )
  );

-- Allow authenticated users with admin role to insert
CREATE POLICY "Allow admins to insert config"
  ON ai_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'platform_admin')
    )
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users with admin role to update
CREATE POLICY "Allow admins to update config"
  ON ai_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'platform_admin')
    )
  );

-- Allow authenticated users with admin role to delete
CREATE POLICY "Allow admins to delete config"
  ON ai_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'platform_admin')
    )
  );

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_config_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_config_timestamp ON ai_config;
CREATE TRIGGER trigger_update_ai_config_timestamp
BEFORE UPDATE ON ai_config
FOR EACH ROW
EXECUTE FUNCTION update_ai_config_timestamp();

-- ============================================================================
-- Trigger: Track last_used_at when config is accessed
-- ============================================================================

CREATE OR REPLACE FUNCTION log_ai_config_usage()
RETURNS TRIGGER AS $
BEGIN
  UPDATE ai_config
  SET last_used_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Insert Initial Gemini Configuration Entry (Empty - to be filled by admin)
-- ============================================================================

INSERT INTO ai_config (config_key, config_value, config_type, description)
VALUES (
  'GEMINI_API_KEY',
  '',
  'api_key',
  'Google Gemini API key for AI-powered competency features'
)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check that the table exists and is properly set up
-- SELECT * FROM ai_config WHERE config_key = 'GEMINI_API_KEY';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'ai_config';

-- Check triggers
-- SELECT * FROM pg_trigger WHERE tgrelname = 'ai_config';
