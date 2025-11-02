# AI Virtual CFO - Supabase + QuickBooks Integration Setup Guide

**Complete step-by-step guide for setting up your AI CFO with QuickBooks integration**

Timeline: ~2 hours to complete all steps

---

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ Supabase project already created (you mentioned you have this)
- ✅ Supabase project credentials (URL + anon key)
- ✅ Code repository cloned locally
- ✅ A QuickBooks Online account (for testing - can use sandbox)
- ✅ Node.js installed (for Supabase CLI)

---

## 🚀 Part 1: Database Setup (15 minutes)

### Step 1.1: Run Base Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your `ai-virtual-cfo` project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"** button

3. **Run Base Schema**
   - Open the file `/supabase/schema.sql` in your code editor
   - Copy **ALL** the contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click **"Run"** (bottom right)
   - **Expected**: `Success. No rows returned`

4. **Verify Base Tables**
   - Go to **Table Editor** (left sidebar)
   - You should see these 9 tables:
     - accounts
     - transactions
     - cash_flow_forecasts
     - recommendations
     - ai_query_history
     - budgets
     - upcoming_events
     - user_profiles
     - integration_connections

---

### Step 1.2: Run QuickBooks Schema Updates

1. **Create New Query**
   - In SQL Editor, click **"New query"** again

2. **Run QuickBooks Schema**
   - Open `/supabase/schema-quickbooks.sql`
   - Copy ALL the contents
   - Paste into SQL Editor
   - Click **"Run"**
   - **Expected**: `Success. No rows returned`

3. **Verify New Tables**
   - Go to **Table Editor**
   - You should now see these additional tables:
     - sync_jobs
     - sync_errors
     - quickbooks_metadata
     - quickbooks_reports
     - ai_insights_cache
     - connection_logs
     - sync_frequency_options

4. **Verify Updated Columns**
   - Click on `accounts` table
   - Check that these new columns exist:
     - external_id
     - external_type
     - sync_status
     - last_synced_at
   - Click on `transactions` table
   - Check same columns exist

✅ **Database setup complete!**

---

## 🔐 Part 2: QuickBooks Developer Setup (20 minutes)

### Step 2.1: Create QuickBooks Developer Account

1. **Go to QuickBooks Developer Portal**
   - Visit: https://developer.intuit.com/

2. **Sign Up / Sign In**
   - Click "Sign in" (top right)
   - Use your Intuit account or create new one
   - Complete the developer registration

3. **Create New App**
   - Go to **"My Apps"** in dashboard
   - Click **"Create an app"**
   - Select **"QuickBooks Online and Payments"**
   - Click **"Create app"**

4. **Configure App Settings**
   - **App name**: `AI Virtual CFO` (or your preferred name)
   - **Company**: Your company name
   - **Description**: AI-powered financial insights for QuickBooks
   - Click **"Create app"**

---

### Step 2.2: Configure OAuth Settings

1. **Go to Keys & OAuth**
   - In your app dashboard, click **"Keys & OAuth"**

2. **Copy Your Credentials**
   Copy these values (you'll need them later):

   **Development (Sandbox):**
   - Client ID: `ABxxx...`
   - Client Secret: `xxx...` (click "Show" to reveal)

   **Production:** (use later when ready to launch)
   - Will have different credentials

3. **Set Redirect URI**
   - Scroll to **"Redirect URIs"**
   - Click **"Add URI"**
   - Enter: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/quickbooks-oauth?action=callback`
   - Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
   - Click **"Save"**

   **To find your project reference:**
   - Go to Supabase → Settings → General
   - Look for "Reference ID"

4. **Set Scopes**
   - Make sure these scopes are selected:
     - ✅ Accounting (com.intuit.quickbooks.accounting)
   - Save changes

✅ **QuickBooks Developer setup complete!**

---

## ⚙️ Part 3: Supabase Configuration (15 minutes)

### Step 3.1: Update Local Configuration

1. **Edit Configuration File**
   - Open `/js/supabase-config.js` in your code editor

2. **Add Your Supabase Credentials**
   ```javascript
   export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'
   export const SUPABASE_ANON_KEY = 'eyJhbG...'  // Your anon key
   ```

   **To get these:**
   - Supabase Dashboard → Settings → API
   - Copy "Project URL" and "anon public" key

3. **Save the file**

---

### Step 3.2: Set Up Edge Function Secrets

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```
   - This will open a browser for authentication
   - Authorize the CLI

3. **Link Your Project**
   ```bash
   cd /path/to/ai-virtual-cfo
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   - Replace `YOUR_PROJECT_REF` with your actual project reference
   - You'll be prompted for your database password (from project creation)

4. **Set QuickBooks Secrets**
   ```bash
   # Set QuickBooks Client ID
   supabase secrets set QUICKBOOKS_CLIENT_ID=YOUR_CLIENT_ID

   # Set QuickBooks Client Secret
   supabase secrets set QUICKBOOKS_CLIENT_SECRET=YOUR_CLIENT_SECRET

   # Set Redirect URI
   supabase secrets set QUICKBOOKS_REDIRECT_URI=https://YOUR_PROJECT_REF.supabase.co/functions/v1/quickbooks-oauth?action=callback

   # Set Anthropic API Key (for AI features)
   supabase secrets set ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
   ```

   Replace:
   - `YOUR_CLIENT_ID` - from QuickBooks Developer Portal
   - `YOUR_CLIENT_SECRET` - from QuickBooks Developer Portal
   - `YOUR_PROJECT_REF` - your Supabase project reference
   - `YOUR_ANTHROPIC_KEY` - get from https://console.anthropic.com (optional for now)

5. **Verify Secrets**
   ```bash
   supabase secrets list
   ```
   - Should show all 4 secrets set

✅ **Configuration complete!**

---

## 🚀 Part 4: Deploy Edge Functions (20 minutes)

### Step 4.1: Deploy QuickBooks OAuth Function

1. **Deploy the OAuth Function**
   ```bash
   supabase functions deploy quickbooks-oauth
   ```

2. **Verify Deployment**
   - Go to Supabase Dashboard → Edge Functions
   - You should see `quickbooks-oauth` listed
   - Status should be "Active"

3. **Test the Function**
   ```bash
   curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/quickbooks-oauth?action=test
   ```
   - Should return a response (even if it's an error about missing params)

---

### Step 4.2: Deploy QuickBooks Sync Function

1. **Deploy the Sync Function**
   ```bash
   supabase functions deploy quickbooks-sync
   ```

2. **Verify Deployment**
   - Should see `quickbooks-sync` in Edge Functions list

---

### Step 4.3: Deploy AI Query Function

1. **Deploy the AI Function**
   ```bash
   supabase functions deploy ai-query
   ```

2. **Verify All Functions**
   - Go to Supabase Dashboard → Edge Functions
   - Should see 3 functions:
     - ✅ quickbooks-oauth
     - ✅ quickbooks-sync
     - ✅ ai-query

✅ **Edge Functions deployed!**

---

## 🎨 Part 5: Frontend Updates (10 minutes)

### Step 5.1: Verify Configuration

1. **Check Supabase Config**
   - Open `/js/supabase-config.js`
   - Verify URL and key are correct

2. **Check HTML**
   - Open `/index.html` in browser
   - Should see login modal

3. **Test Authentication**
   - Try signing up with a test account
   - Email: test@example.com
   - Password: test123456
   - Should successfully create account and log in

---

### Step 5.2: Add QuickBooks Connect Button (Coming in next phase)

**Note:** The full UI updates for QuickBooks connection will be implemented next. For now, we're setting up the backend infrastructure.

✅ **Frontend verified!**

---

## 🧪 Part 6: Testing (30 minutes)

### Step 6.1: Test Database

1. **Create Test User**
   - Open your app in browser
   - Sign up with a test account
   - Verify you can log in

2. **Check User in Database**
   - Go to Supabase → Table Editor → auth.users
   - Your test user should be listed
   - Copy the user `id` (UUID)

3. **Test Functions**
   - Go to SQL Editor
   - Run this query (replace with your user ID):
   ```sql
   SELECT get_sync_status('YOUR_USER_ID');
   ```
   - Should return JSON with sync status

---

### Step 6.2: Test QuickBooks OAuth (Manual Test)

1. **Get Authorization URL**
   - Use this curl command (replace with your values):
   ```bash
   curl -X GET \
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/quickbooks-oauth?action=authorize' \
     -H 'Authorization: Bearer YOUR_USER_TOKEN'
   ```

2. **Expected Response**
   ```json
   {
     "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?...",
     "state": "..."
   }
   ```

3. **Test in Browser**
   - Copy the `authorizationUrl`
   - Paste in browser
   - Should redirect to QuickBooks login
   - (Don't complete the flow yet - we'll do full integration testing later)

---

### Step 6.3: Test Edge Functions

1. **Check Function Logs**
   ```bash
   # View OAuth function logs
   supabase functions logs quickbooks-oauth

   # View Sync function logs
   supabase functions logs quickbooks-sync

   # View AI function logs
   supabase functions logs ai-query
   ```

2. **Verify No Errors**
   - Logs should show successful deployments
   - No critical errors

✅ **Testing complete!**

---

## 📊 Part 7: Verify Complete Setup

### Verification Checklist

Run through this checklist to ensure everything is set up:

#### Database
- [ ] Base schema deployed (9 tables)
- [ ] QuickBooks schema deployed (6 additional tables + updates)
- [ ] All tables visible in Table Editor
- [ ] RLS policies enabled on all tables
- [ ] Functions created (calculate_health_score, get_sync_status, etc.)

#### QuickBooks Developer
- [ ] Developer account created
- [ ] App created in developer portal
- [ ] Client ID and Client Secret obtained
- [ ] Redirect URI configured
- [ ] Accounting scope selected

#### Supabase Configuration
- [ ] Local config file updated with credentials
- [ ] Supabase CLI installed and logged in
- [ ] Project linked to CLI
- [ ] All 4 secrets set (QB Client ID, Secret, Redirect URI, Anthropic Key)
- [ ] Secrets verified with `supabase secrets list`

#### Edge Functions
- [ ] quickbooks-oauth deployed
- [ ] quickbooks-sync deployed
- [ ] ai-query deployed
- [ ] All functions showing as "Active" in dashboard
- [ ] No deployment errors in logs

#### Frontend
- [ ] Can open app in browser
- [ ] Login modal appears
- [ ] Can create test account
- [ ] Can sign in successfully
- [ ] Dashboard loads (even if empty)

#### Testing
- [ ] Test user exists in auth.users
- [ ] SQL functions work (get_sync_status)
- [ ] OAuth authorize endpoint returns URL
- [ ] Edge Function logs show no critical errors

---

## 🎯 What's Next?

### Phase 1 Complete! ✅

You've successfully set up:
- ✅ Database with QuickBooks integration support
- ✅ QuickBooks Developer credentials
- ✅ Edge Functions for OAuth and sync
- ✅ Configuration and secrets

### Phase 2: Frontend Integration (Week 3-4)

Next steps will include:
1. **Add "Connect QuickBooks" button** to dashboard
2. **Implement OAuth flow** in frontend
3. **Add sync status display**
4. **Show connected account info**
5. **Add manual sync trigger**

### Phase 3: AI Insights (Week 5-6)

1. **Adapt AI insights** to work with QuickBooks data
2. **Implement financial health scoring** using real QB data
3. **Add cash flow forecasting** based on QB transactions
4. **Generate smart recommendations**

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Failed to deploy Edge Function"

**Solution:**
```bash
# Check you're logged in
supabase login

# Verify project is linked
supabase link --project-ref YOUR_PROJECT_REF

# Try deploying again with verbose output
supabase functions deploy quickbooks-oauth --debug
```

---

#### Issue: "Secrets not found"

**Solution:**
```bash
# List current secrets
supabase secrets list

# Set missing secrets
supabase secrets set QUICKBOOKS_CLIENT_ID=YOUR_VALUE

# Redeploy function after setting secrets
supabase functions deploy quickbooks-oauth
```

---

#### Issue: "OAuth redirect URI mismatch"

**Problem:** QuickBooks returns error about redirect URI

**Solution:**
1. Go to QuickBooks Developer Portal → Your App → Keys & OAuth
2. Verify Redirect URI exactly matches:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/quickbooks-oauth?action=callback
   ```
3. Make sure there are no trailing slashes or extra spaces
4. Save and try again

---

#### Issue: "Table already exists" when running schema

**Solution:**
- This is normal if you've run the schema before
- The scripts use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- Safe to run multiple times

---

#### Issue: "Auth user not found"

**Problem:** Edge Function can't authenticate user

**Solution:**
1. Make sure you're sending Authorization header:
   ```
   Authorization: Bearer YOUR_USER_JWT_TOKEN
   ```
2. Get token from your app's session
3. Token expires after 1 hour - may need to refresh

---

## 📞 Getting Help

If you encounter issues:

1. **Check Logs**
   - Supabase Dashboard → Logs
   - Edge Functions → Function → Logs tab
   - SQL Editor → Run queries to check data

2. **Verify Configuration**
   - Double-check all secrets are set
   - Verify QuickBooks redirect URI matches exactly
   - Confirm Supabase URL and keys are correct

3. **Test Components Individually**
   - Test database with SQL queries
   - Test Edge Functions with curl
   - Test OAuth flow in browser
   - Check browser console for frontend errors

4. **Reference Documentation**
   - Supabase Docs: https://supabase.com/docs
   - QuickBooks API Docs: https://developer.intuit.com/
   - Edge Functions Guide: https://supabase.com/docs/guides/functions

---

## 🎉 Congratulations!

You've completed the Supabase + QuickBooks integration setup!

**What you've accomplished:**
- ✅ Complete database schema for QuickBooks integration
- ✅ QuickBooks Developer account and app configured
- ✅ OAuth flow ready for QuickBooks connection
- ✅ Data sync service deployed
- ✅ AI insights infrastructure in place
- ✅ All Edge Functions deployed and ready

**You're now ready for Phase 2: Frontend Integration!**

---

## 📚 Additional Resources

- **QuickBooks API Explorer**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **OAuth 2.0 Flow**: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0

---

**Questions or issues?** Let me know and I'll help you resolve them! 🚀
