# Testing Guide for AI Virtual CFO with Supabase

This guide will help you test your AI Virtual CFO application after setting up Supabase.

## Prerequisites

Before testing, ensure you have:

1. ✅ Created a Supabase project
2. ✅ Run the schema.sql file in Supabase SQL Editor
3. ✅ Updated js/supabase-config.js with your credentials
4. ✅ (Optional) Deployed the ai-query Edge Function

## Testing Steps

### 1. Test Authentication

#### Sign Up Flow

1. Open `index.html` in a web browser
2. You should see a login modal automatically
3. Click "Sign up" link
4. Fill in:
   - Company Name: "Test Company" (optional)
   - Email: your-email@example.com
   - Password: testpass123
   - Confirm Password: testpass123
5. Click "Create Account"
6. **Expected Result**: Success message appears, then switches to login form

**Note**: Supabase sends a confirmation email by default. For testing:
- Go to Supabase Dashboard → Authentication → Settings
- Disable "Enable email confirmations"
- Or check your email and click the confirmation link

#### Sign In Flow

1. On the login form, enter:
   - Email: your-email@example.com
   - Password: testpass123
2. Click "Sign In"
3. **Expected Result**:
   - Modal closes
   - Dashboard appears
   - Your email shows in the sidebar
   - Logout button is visible

### 2. Test Dashboard Data Loading

After logging in, verify these sections:

#### Financial Snapshot (Top Cards)
- **Expected**: Should show $0 initially (no data yet)
- **Cards**:
  - Cash Position
  - Monthly Revenue
  - Monthly Expenses
  - Profit Margin

#### Cash Flow Chart
- **Expected**: Empty or no data message
- **Location**: Large chart in center-left

#### Upcoming Events
- **Expected**: "No upcoming events" message initially
- **Location**: Right sidebar panel

#### Financial Health Score
- **Expected**: 0/100 with all sub-metrics at 0%
- **Metrics**: Liquidity, Profitability, Efficiency, Growth

#### AI Recommendations
- **Expected**: "No recommendations available" message
- **Location**: Bottom of page

### 3. Add Test Data

To see the dashboard in action, add test data:

#### Option A: Use Seed Data SQL

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/seed.sql` file
3. **IMPORTANT**: Replace all instances of `'YOUR_USER_ID'` with your actual user ID
   - To get your user ID:
     ```sql
     SELECT id, email FROM auth.users;
     ```
   - Copy your user ID (UUID format: xxxx-xxxx-xxxx...)
   - Replace in seed.sql file
4. Run the seed.sql script
5. Refresh your dashboard

#### Option B: Add Data Manually via Supabase Dashboard

1. Go to **Table Editor** → **accounts**
2. Click "Insert row"
3. Add:
   - user_id: [Your user ID from auth.users]
   - account_name: "Primary Checking"
   - account_type: "cash"
   - balance: 50000.00
   - is_active: true
4. Repeat for other tables (transactions, recommendations, etc.)

### 4. Test Dashboard with Data

After adding data, refresh the dashboard:

#### Financial Snapshot
- **Expected**: Real numbers appear
- **Example**: Cash Position: $50,000.00

#### Cash Flow Chart
- **Expected**: Line chart with 90 days of forecast data
- **Lines**: Cash In (green), Cash Out (red), Net Cash Flow (blue)

#### Revenue & Expense Charts
- **Expected**: Doughnut charts with category breakdowns
- **Should show**: Different colors for each category

#### Financial Health Score
- **Expected**: Calculated score appears (0-100)
- **Sub-metrics**: Should show percentages with colored bars

### 5. Test AI Assistant

#### Without Edge Function (Mock Responses)

1. Scroll to "AI Assistant" section at top of dashboard
2. Type a query in the input box:
   - "How is my cash flow?"
   - "What are my biggest expenses?"
   - "How can I improve revenue?"
3. Click Send button (or press Enter)
4. **Expected**: Mock response appears below input box after 1-2 seconds
5. **Response should**: Be relevant to your query

#### With Edge Function (Real AI)

If you deployed the ai-query Edge Function:

1. Ensure ANTHROPIC_API_KEY is set in Supabase secrets
2. Test the same queries as above
3. **Expected**: More detailed, context-aware responses
4. **Response time**: 2-5 seconds

### 6. Test Real-time Updates

Test that dashboard updates automatically when data changes:

1. Keep dashboard open in browser
2. In another tab, open Supabase Dashboard
3. Go to **Table Editor** → **transactions**
4. Add a new transaction for your user
5. Switch back to dashboard tab
6. **Expected**: Dashboard updates automatically (within 2-3 seconds)
7. **Updates should affect**:
   - Financial snapshot numbers
   - Cash flow chart
   - Revenue/Expense charts

### 7. Test Logout

1. Click "Logout" button in sidebar
2. Confirm logout when prompted
3. **Expected**:
   - Dashboard disappears
   - Login modal appears again
   - Page reloads

### 8. Test Error Handling

#### Invalid Login
1. On login form, enter:
   - Email: wrong@example.com
   - Password: wrongpass
2. Click "Sign In"
3. **Expected**: Error message appears in red

#### Weak Password on Signup
1. On signup form, enter:
   - Password: "123" (too short)
2. **Expected**: Error message about minimum length

#### Empty AI Query
1. Click Send button without typing anything
2. **Expected**: Nothing happens (button should be disabled or ignored)

## Common Issues and Solutions

### Issue: "Failed to fetch" errors

**Cause**: Incorrect Supabase credentials

**Solution**:
1. Check `js/supabase-config.js`
2. Verify SUPABASE_URL and SUPABASE_ANON_KEY match your dashboard
3. Go to Supabase → Settings → API to get correct values

### Issue: Login succeeds but dashboard shows no data

**Cause**: No data in database for your user

**Solution**:
1. Add test data using seed.sql (see step 3)
2. Or manually add data via Table Editor

### Issue: "Unauthorized" errors

**Cause**: Row Level Security (RLS) policies blocking access

**Solution**:
1. Verify you're logged in (check browser console)
2. Check RLS policies in Supabase → Authentication → Policies
3. Ensure policies allow SELECT for `auth.uid() = user_id`

### Issue: Charts not displaying

**Cause**: Chart.js not loaded or data format issues

**Solution**:
1. Check browser console for errors
2. Verify Chart.js CDN is loading (check Network tab)
3. Ensure data format is correct (arrays of numbers)

### Issue: AI responses timing out

**Cause**: Edge Function timeout or API key issues

**Solution**:
1. Check Edge Function logs: `supabase functions logs ai-query`
2. Verify ANTHROPIC_API_KEY is set
3. Falls back to mock responses automatically

### Issue: Email confirmation required

**Cause**: Supabase email confirmation is enabled

**Solution**:
1. Go to Authentication → Settings
2. Disable "Enable email confirmations" for testing
3. Or use a real email and click confirmation link

## Performance Benchmarks

Expected load times:

| Operation | Time | Notes |
|-----------|------|-------|
| Page load | < 1s | Initial HTML load |
| Authentication check | < 500ms | Checking if user logged in |
| Dashboard data load | 1-2s | Loading all dashboard data |
| Chart rendering | < 500ms | After data loads |
| AI query (mock) | < 100ms | Instant mock responses |
| AI query (real) | 2-5s | Depends on Claude API |
| Real-time update | < 3s | When data changes |

## Security Testing

### Test Row Level Security

1. Get your user ID from `auth.users`
2. In SQL Editor, try to access another user's data:
   ```sql
   SELECT * FROM transactions WHERE user_id != 'YOUR_USER_ID';
   ```
3. **Expected**: Should return empty (RLS blocks it)

### Test Authentication Token

1. Log out
2. Try to access `supabase.from('accounts').select()`
3. **Expected**: Should fail with "Not authenticated" error

## Browser Compatibility

Test in multiple browsers:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Mobile Testing

1. Open on mobile device or use browser DevTools responsive mode
2. **Expected**:
   - Login modal is centered and readable
   - Sidebar collapses on mobile
   - Charts are responsive
   - Forms are usable

## Next Steps After Testing

Once all tests pass:

1. ✅ Authentication works
2. ✅ Dashboard loads with data
3. ✅ Charts render correctly
4. ✅ AI assistant responds
5. ✅ Real-time updates work
6. ✅ Logout works

You're ready for:
- Adding more features
- Integrating third-party services (QuickBooks, etc.)
- Deploying to production
- Customizing the UI

## Getting Help

If you encounter issues:

1. Check browser console for errors (F12 → Console)
2. Check Supabase logs (Dashboard → Logs)
3. Review SUPABASE_SETUP.md for configuration steps
4. Check Supabase documentation: https://supabase.com/docs
5. Verify all SQL scripts ran successfully

## Test Checklist

Use this checklist to track your testing:

- [ ] Sign up works
- [ ] Email confirmation (if enabled)
- [ ] Sign in works
- [ ] Dashboard appears after login
- [ ] Financial snapshot shows data
- [ ] Cash flow chart renders
- [ ] Revenue chart renders
- [ ] Expenses chart renders
- [ ] Health score calculates
- [ ] Upcoming events load
- [ ] Recommendations load
- [ ] AI assistant responds
- [ ] Real-time updates work
- [ ] Logout works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Multiple browsers tested
- [ ] RLS security tested

---

**Congratulations!** If all tests pass, your Supabase integration is working correctly. You now have a fully functional, database-backed AI Virtual CFO dashboard!
