-- AI Virtual CFO Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================
-- TABLES
-- ============================================

-- Financial Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('cash', 'revenue', 'expense', 'asset', 'liability')) NOT NULL,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  transaction_date DATE NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('income', 'expense', 'transfer')) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  tags TEXT[],
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(user_id, category);

-- Cash Flow Forecasts Table
CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_cash_in NUMERIC(15,2) NOT NULL DEFAULT 0,
  predicted_cash_out NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_cash_flow NUMERIC(15,2) GENERATED ALWAYS AS (predicted_cash_in - predicted_cash_out) STORED,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  calculation_method TEXT DEFAULT 'ai_predicted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_date ON cash_flow_forecasts(user_id, forecast_date);

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_level TEXT CHECK (impact_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category TEXT,
  estimated_savings NUMERIC(15,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'in_progress')),
  priority INTEGER DEFAULT 0,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(user_id, status);

-- AI Query History Table (for tracking AI assistant interactions)
CREATE TABLE IF NOT EXISTS ai_query_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  query_type TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  budget_amount NUMERIC(15,2) NOT NULL,
  period TEXT CHECK (period IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, period, start_date)
);

-- Upcoming Events/Payments Table
CREATE TABLE IF NOT EXISTS upcoming_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  amount NUMERIC(15,2),
  priority TEXT CHECK (priority IN ('urgent', 'important', 'upcoming', 'low')) DEFAULT 'upcoming',
  category TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upcoming_events_date ON upcoming_events(user_id, event_date);

-- User Settings/Profile Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  industry TEXT,
  fiscal_year_start DATE,
  default_currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Connections Table (for QuickBooks, Xero, etc.)
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('quickbooks', 'xero', 'stripe', 'plaid', 'other')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  realm_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate financial health score
CREATE OR REPLACE FUNCTION calculate_health_score(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_liquidity_score NUMERIC;
  v_profitability_score NUMERIC;
  v_efficiency_score NUMERIC;
  v_growth_score NUMERIC;
  v_overall_score NUMERIC;
  v_cash_position NUMERIC;
  v_monthly_revenue NUMERIC;
  v_monthly_expenses NUMERIC;
BEGIN
  -- Get cash position
  SELECT COALESCE(SUM(balance), 0) INTO v_cash_position
  FROM accounts
  WHERE user_id = p_user_id AND account_type = 'cash' AND is_active = true;

  -- Get monthly revenue (last 30 days)
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue
  FROM transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'income'
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get monthly expenses (last 30 days)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_monthly_expenses
  FROM transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'expense'
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Calculate liquidity score (based on months of expenses covered)
  IF v_monthly_expenses > 0 THEN
    v_liquidity_score := LEAST((v_cash_position / v_monthly_expenses) * 20, 100);
  ELSE
    v_liquidity_score := 50;
  END IF;

  -- Calculate profitability score
  IF v_monthly_revenue > 0 THEN
    v_profitability_score := LEAST(((v_monthly_revenue - v_monthly_expenses) / v_monthly_revenue) * 100, 100);
    v_profitability_score := GREATEST(v_profitability_score, 0);
  ELSE
    v_profitability_score := 0;
  END IF;

  -- Calculate efficiency score (simplified)
  IF v_monthly_revenue > 0 THEN
    v_efficiency_score := LEAST((v_monthly_expenses / v_monthly_revenue) * 100, 100);
    v_efficiency_score := 100 - v_efficiency_score;
  ELSE
    v_efficiency_score := 50;
  END IF;

  -- Calculate growth score (compare to previous month)
  v_growth_score := 75; -- Placeholder

  -- Calculate overall score
  v_overall_score := (
    v_liquidity_score * 0.3 +
    v_profitability_score * 0.3 +
    v_efficiency_score * 0.2 +
    v_growth_score * 0.2
  );

  RETURN json_build_object(
    'overall_score', ROUND(v_overall_score, 0),
    'liquidity', ROUND(v_liquidity_score, 0),
    'profitability', ROUND(v_profitability_score, 0),
    'efficiency', ROUND(v_efficiency_score, 0),
    'growth', ROUND(v_growth_score, 0),
    'cash_position', v_cash_position,
    'monthly_revenue', v_monthly_revenue,
    'monthly_expenses', v_monthly_expenses,
    'profit_margin', CASE
      WHEN v_monthly_revenue > 0
      THEN ROUND(((v_monthly_revenue - v_monthly_expenses) / v_monthly_revenue * 100), 1)
      ELSE 0
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue breakdown by category
CREATE OR REPLACE FUNCTION get_revenue_breakdown(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(category, total)
    FROM (
      SELECT
        category,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = p_user_id
        AND transaction_type = 'income'
        AND transaction_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY category
      ORDER BY total DESC
    ) subquery
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expense breakdown by category
CREATE OR REPLACE FUNCTION get_expense_breakdown(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(category, total)
    FROM (
      SELECT
        category,
        SUM(ABS(amount)) as total
      FROM transactions
      WHERE user_id = p_user_id
        AND transaction_type = 'expense'
        AND transaction_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY category
      ORDER BY total DESC
    ) subquery
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Add updated_at triggers to all tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forecasts_updated_at BEFORE UPDATE ON cash_flow_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upcoming_events_updated_at BEFORE UPDATE ON upcoming_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cash_flow_forecasts
CREATE POLICY "Users can view own forecasts" ON cash_flow_forecasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own forecasts" ON cash_flow_forecasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forecasts" ON cash_flow_forecasts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own forecasts" ON cash_flow_forecasts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recommendations
CREATE POLICY "Users can view own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations" ON recommendations FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_query_history
CREATE POLICY "Users can view own query history" ON ai_query_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queries" ON ai_query_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for budgets
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for upcoming_events
CREATE POLICY "Users can view own events" ON upcoming_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON upcoming_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON upcoming_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON upcoming_events FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for integration_connections
CREATE POLICY "Users can view own integrations" ON integration_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations" ON integration_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON integration_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON integration_connections FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INITIAL DATA / VIEWS
-- ============================================

-- Create a view for dashboard summary
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
  user_id,
  (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE user_id = t.user_id AND account_type = 'cash') as cash_position,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = t.user_id AND transaction_type = 'income' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_revenue,
  (SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE user_id = t.user_id AND transaction_type = 'expense' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_expenses
FROM (SELECT DISTINCT user_id FROM accounts UNION SELECT DISTINCT user_id FROM transactions) t;

-- Grant access to authenticated users
GRANT SELECT ON dashboard_summary TO authenticated;

-- ============================================
-- COMPLETED
-- ============================================

-- Schema creation complete!
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify tables were created in Table Editor
-- 3. Test RLS policies by inserting data
-- 4. Populate with seed data (see seed.sql)
