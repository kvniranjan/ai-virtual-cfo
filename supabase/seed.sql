-- Seed Data for AI Virtual CFO
-- This creates sample data for testing
-- IMPORTANT: Replace 'YOUR_USER_ID' with your actual user ID from auth.users

-- You can get your user ID by running:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- For this example, let's assume user_id is: '00000000-0000-0000-0000-000000000000'
-- REPLACE THIS WITH YOUR ACTUAL USER ID!

-- ============================================
-- Sample Accounts
-- ============================================

INSERT INTO accounts (user_id, account_name, account_type, balance, description) VALUES
  ('YOUR_USER_ID', 'Primary Checking', 'cash', 42750.00, 'Main business checking account'),
  ('YOUR_USER_ID', 'Savings Account', 'cash', 25000.00, 'Emergency fund'),
  ('YOUR_USER_ID', 'Accounts Receivable', 'asset', 15000.00, 'Outstanding invoices');

-- ============================================
-- Sample Transactions (Last 30 days)
-- ============================================

-- Revenue transactions
INSERT INTO transactions (user_id, amount, category, subcategory, description, transaction_date, transaction_type) VALUES
  ('YOUR_USER_ID', 15000.00, 'Product Sales', 'Software', 'Product sale - Enterprise plan', CURRENT_DATE - INTERVAL '2 days', 'income'),
  ('YOUR_USER_ID', 8500.00, 'Services', 'Consulting', 'Consulting services - Client A', CURRENT_DATE - INTERVAL '5 days', 'income'),
  ('YOUR_USER_ID', 7500.00, 'Subscriptions', 'Monthly', 'Monthly subscription revenue', CURRENT_DATE - INTERVAL '10 days', 'income'),
  ('YOUR_USER_ID', 5000.00, 'Product Sales', 'Hardware', 'Hardware sales', CURRENT_DATE - INTERVAL '12 days', 'income'),
  ('YOUR_USER_ID', 2500.00, 'Other', 'Misc', 'Miscellaneous income', CURRENT_DATE - INTERVAL '15 days', 'income');

-- Expense transactions
INSERT INTO transactions (user_id, amount, category, subcategory, description, transaction_date, transaction_type) VALUES
  ('YOUR_USER_ID', -12000.00, 'Payroll', 'Salaries', 'Employee salaries', CURRENT_DATE - INTERVAL '1 day', 'expense'),
  ('YOUR_USER_ID', -4500.00, 'Rent', 'Office', 'Monthly office rent', CURRENT_DATE - INTERVAL '3 days', 'expense'),
  ('YOUR_USER_ID', -3500.00, 'Marketing', 'Digital Ads', 'Google Ads campaign', CURRENT_DATE - INTERVAL '4 days', 'expense'),
  ('YOUR_USER_ID', -2800.00, 'Software', 'Subscriptions', 'SaaS subscriptions', CURRENT_DATE - INTERVAL '6 days', 'expense'),
  ('YOUR_USER_ID', -2200.00, 'Utilities', 'Office', 'Internet and utilities', CURRENT_DATE - INTERVAL '8 days', 'expense'),
  ('YOUR_USER_ID', -1800.00, 'Other', 'Misc', 'Miscellaneous expenses', CURRENT_DATE - INTERVAL '14 days', 'expense');

-- ============================================
-- Sample Cash Flow Forecasts (Next 90 days)
-- ============================================

-- Generate forecasts for next 90 days
INSERT INTO cash_flow_forecasts (user_id, forecast_date, predicted_cash_in, predicted_cash_out, confidence_score)
SELECT
  'YOUR_USER_ID',
  CURRENT_DATE + (n || ' days')::INTERVAL,
  40000 + (random() * 18000)::NUMERIC(15,2), -- Random between 40k-58k
  30000 + (random() * 19000)::NUMERIC(15,2), -- Random between 30k-49k
  0.70 + (random() * 0.25)::NUMERIC(3,2) -- Random confidence between 0.70-0.95
FROM generate_series(1, 90) AS n;

-- ============================================
-- Sample AI Recommendations
-- ============================================

INSERT INTO recommendations (user_id, title, description, impact_level, category, estimated_savings, status, priority) VALUES
  ('YOUR_USER_ID',
   'Optimize Accounts Receivable',
   'You have $15,000 in outstanding invoices. Consider implementing automated payment reminders to improve cash flow by collecting payments 7-10 days faster.',
   'high',
   'Cash Flow',
   2500.00,
   'active',
   1),
  ('YOUR_USER_ID',
   'Consolidate Software Subscriptions',
   'Analysis shows you''re spending $2,800/month on various SaaS tools. Consider consolidating to all-in-one platforms to save approximately $600/month.',
   'medium',
   'Cost Reduction',
   600.00,
   'active',
   2),
  ('YOUR_USER_ID',
   'Tax Deduction Opportunity',
   'Your marketing expenses ($3,500) qualify for additional tax deductions. Ensure proper documentation is maintained for year-end filing.',
   'medium',
   'Tax Planning',
   1200.00,
   'active',
   3);

-- ============================================
-- Sample Upcoming Events
-- ============================================

INSERT INTO upcoming_events (user_id, title, description, event_date, amount, priority, category) VALUES
  ('YOUR_USER_ID', 'Q1 Tax Payment', 'Estimated quarterly tax payment due', CURRENT_DATE + INTERVAL '14 days', -8500.00, 'urgent', 'Taxes'),
  ('YOUR_USER_ID', 'Office Lease Renewal', 'Annual office lease renewal negotiation', CURRENT_DATE + INTERVAL '30 days', -54000.00, 'important', 'Rent'),
  ('YOUR_USER_ID', 'Software Subscription Renewal', 'Annual SaaS subscription renewal', CURRENT_DATE + INTERVAL '45 days', -3360.00, 'upcoming', 'Software'),
  ('YOUR_USER_ID', 'Insurance Renewal', 'Business insurance policy renewal', CURRENT_DATE + INTERVAL '60 days', -4200.00, 'upcoming', 'Insurance');

-- ============================================
-- Sample Budgets
-- ============================================

INSERT INTO budgets (user_id, category, budget_amount, period, start_date) VALUES
  ('YOUR_USER_ID', 'Payroll', 12000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)),
  ('YOUR_USER_ID', 'Marketing', 4000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)),
  ('YOUR_USER_ID', 'Software', 3000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)),
  ('YOUR_USER_ID', 'Rent', 4500.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)),
  ('YOUR_USER_ID', 'Utilities', 2500.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE));

-- ============================================
-- Sample User Profile
-- ============================================

INSERT INTO user_profiles (id, company_name, industry, fiscal_year_start, default_currency)
VALUES
  ('YOUR_USER_ID', 'Acme Corporation', 'Technology', '2024-01-01', 'USD')
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  industry = EXCLUDED.industry;

-- ============================================
-- Verify Data
-- ============================================

-- Run these queries to verify data was inserted:
-- SELECT * FROM accounts WHERE user_id = 'YOUR_USER_ID';
-- SELECT * FROM transactions WHERE user_id = 'YOUR_USER_ID' ORDER BY transaction_date DESC;
-- SELECT * FROM cash_flow_forecasts WHERE user_id = 'YOUR_USER_ID' LIMIT 10;
-- SELECT * FROM recommendations WHERE user_id = 'YOUR_USER_ID';
-- SELECT * FROM upcoming_events WHERE user_id = 'YOUR_USER_ID';

-- Test the health score function:
-- SELECT calculate_health_score('YOUR_USER_ID');

-- Test revenue/expense breakdown functions:
-- SELECT get_revenue_breakdown('YOUR_USER_ID', 30);
-- SELECT get_expense_breakdown('YOUR_USER_ID', 30);
