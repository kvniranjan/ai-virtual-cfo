-- QuickBooks Integration Schema Updates
-- Run this AFTER the base schema.sql to add QuickBooks integration support

-- ============================================
-- UPDATES TO EXISTING TABLES
-- ============================================

-- Add external IDs and sync metadata to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_type TEXT; -- 'Bank', 'CreditCard', 'Expense', etc.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_accounts_external_id ON accounts(external_id);
CREATE INDEX IF NOT EXISTS idx_accounts_sync_status ON accounts(user_id, sync_status);

-- Add external IDs and sync metadata to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_type TEXT; -- 'Invoice', 'Bill', 'Payment', etc.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(user_id, sync_status);

-- Update integration_connections table
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS sync_frequency TEXT DEFAULT 'daily'; -- 'manual', 'daily', 'realtime'
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- ============================================
-- NEW TABLES
-- ============================================

-- Sync jobs tracking
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON sync_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON sync_jobs(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status, created_at DESC);

-- Sync errors detailed logging
CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  error_type TEXT NOT NULL, -- 'api_error', 'validation_error', 'rate_limit', etc.
  error_message TEXT NOT NULL,
  error_details JSONB,
  record_type TEXT, -- 'account', 'transaction', etc.
  record_id TEXT, -- external ID that failed
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_errors_job ON sync_errors(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_sync_errors_user ON sync_errors(user_id, created_at DESC);

-- QuickBooks specific metadata cache
CREATE TABLE IF NOT EXISTS quickbooks_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE NOT NULL,
  company_info JSONB, -- Company name, fiscal year, etc.
  chart_of_accounts JSONB, -- Full COA structure
  preferences JSONB, -- QB preferences and settings
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_id)
);

-- QuickBooks reports cache (for performance)
CREATE TABLE IF NOT EXISTS quickbooks_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL, -- 'ProfitAndLoss', 'BalanceSheet', 'CashFlow'
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_data JSONB NOT NULL, -- Raw report JSON from QB
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id, integration_id, report_type, report_period_start, report_period_end)
);

CREATE INDEX IF NOT EXISTS idx_qb_reports_user ON quickbooks_reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_qb_reports_expires ON quickbooks_reports(expires_at);

-- AI insights cache (to avoid regenerating same insights)
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL, -- 'health_score', 'forecast', 'recommendation'
  insight_data JSONB NOT NULL,
  data_hash TEXT NOT NULL, -- Hash of input data to detect changes
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id, insight_type, data_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights_cache(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires ON ai_insights_cache(expires_at);

-- Connection status log (audit trail)
CREATE TABLE IF NOT EXISTS connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'connected', 'disconnected', 'token_refreshed', 'error'
  event_message TEXT,
  event_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connection_logs_user ON connection_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_integration ON connection_logs(integration_id, created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to mark integration as disconnected
CREATE OR REPLACE FUNCTION disconnect_integration(p_integration_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE integration_connections
  SET
    is_active = false,
    access_token = NULL,
    refresh_token = NULL,
    updated_at = NOW()
  WHERE id = p_integration_id;

  -- Log the disconnection
  INSERT INTO connection_logs (user_id, integration_id, event_type, event_message)
  SELECT user_id, id, 'disconnected', 'User disconnected integration'
  FROM integration_connections
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last sync timestamp
CREATE OR REPLACE FUNCTION update_last_sync(p_integration_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE integration_connections
  SET
    last_sync_at = NOW(),
    next_sync_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW()
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sync status summary
CREATE OR REPLACE FUNCTION get_sync_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'integrations', (
      SELECT json_agg(json_build_object(
        'id', id,
        'provider', provider,
        'company_name', company_name,
        'is_active', is_active,
        'last_sync', last_sync_at,
        'next_sync', next_sync_at,
        'sync_frequency', sync_frequency
      ))
      FROM integration_connections
      WHERE user_id = p_user_id AND is_active = true
    ),
    'pending_syncs', (
      SELECT COUNT(*)
      FROM sync_jobs
      WHERE user_id = p_user_id AND status IN ('pending', 'running')
    ),
    'recent_errors', (
      SELECT COUNT(*)
      FROM sync_errors
      WHERE user_id = p_user_id
        AND created_at > NOW() - INTERVAL '24 hours'
    ),
    'last_successful_sync', (
      SELECT MAX(completed_at)
      FROM sync_jobs
      WHERE user_id = p_user_id AND status = 'completed'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired caches
CREATE OR REPLACE FUNCTION cleanup_expired_caches()
RETURNS void AS $$
BEGIN
  -- Delete expired report caches
  DELETE FROM quickbooks_reports
  WHERE expires_at < NOW();

  -- Delete expired AI insights
  DELETE FROM ai_insights_cache
  WHERE expires_at < NOW();

  -- Delete old sync jobs (keep 90 days)
  DELETE FROM sync_jobs
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete old connection logs (keep 180 days)
  DELETE FROM connection_logs
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to log connection events
CREATE OR REPLACE FUNCTION log_connection_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO connection_logs (user_id, integration_id, event_type, event_message)
    VALUES (NEW.user_id, NEW.id, 'connected', 'Integration connected');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO connection_logs (user_id, integration_id, event_type, event_message)
      VALUES (NEW.user_id, NEW.id, 'disconnected', 'Integration disconnected');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_connection ON integration_connections;
CREATE TRIGGER trigger_log_connection
  AFTER INSERT OR UPDATE ON integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION log_connection_event();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_jobs
CREATE POLICY "Users can view own sync jobs" ON sync_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage sync jobs" ON sync_jobs FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for sync_errors
CREATE POLICY "Users can view own sync errors" ON sync_errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage sync errors" ON sync_errors FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for quickbooks_metadata
CREATE POLICY "Users can view own QB metadata" ON quickbooks_metadata FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage QB metadata" ON quickbooks_metadata FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for quickbooks_reports
CREATE POLICY "Users can view own QB reports" ON quickbooks_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage QB reports" ON quickbooks_reports FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_insights_cache
CREATE POLICY "Users can view own AI insights" ON ai_insights_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage AI insights" ON ai_insights_cache FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for connection_logs
CREATE POLICY "Users can view own connection logs" ON connection_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage connection logs" ON connection_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SCHEDULED CLEANUP (using pg_cron if available)
-- ============================================

-- Note: This requires pg_cron extension
-- If pg_cron is not available, run cleanup_expired_caches() manually or via cron job

-- Uncomment if pg_cron is enabled:
-- SELECT cron.schedule(
--   'cleanup-expired-caches',
--   '0 2 * * *', -- Run at 2 AM daily
--   $$SELECT cleanup_expired_caches()$$
-- );

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default sync frequency options
CREATE TABLE IF NOT EXISTS sync_frequency_options (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  interval_hours INTEGER NOT NULL,
  description TEXT
);

INSERT INTO sync_frequency_options (id, name, interval_hours, description) VALUES
  ('manual', 'Manual', 0, 'Sync only when manually triggered'),
  ('daily', 'Daily', 24, 'Automatic sync every 24 hours'),
  ('twice_daily', 'Twice Daily', 12, 'Automatic sync every 12 hours'),
  ('hourly', 'Hourly', 1, 'Automatic sync every hour (Enterprise only)')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VIEWS FOR EASIER QUERYING
-- ============================================

-- View for active integrations with sync status
CREATE OR REPLACE VIEW v_active_integrations AS
SELECT
  ic.id,
  ic.user_id,
  ic.provider,
  ic.company_name,
  ic.company_id,
  ic.is_active,
  ic.last_sync_at,
  ic.next_sync_at,
  ic.sync_frequency,
  ic.created_at,
  (
    SELECT json_build_object(
      'total_jobs', COUNT(*),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'failed', COUNT(*) FILTER (WHERE status = 'failed'),
      'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'running')),
      'last_job', MAX(created_at)
    )
    FROM sync_jobs sj
    WHERE sj.integration_id = ic.id
  ) as sync_stats
FROM integration_connections ic
WHERE ic.is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON v_active_integrations TO authenticated;

-- ============================================
-- COMPLETED
-- ============================================

-- Schema updates complete!
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify tables were created successfully
-- 3. Set up QuickBooks OAuth credentials
-- 4. Deploy Edge Functions for sync
