# Setup Steps for Your Supabase Project

**Your Project:** https://uvxeykjlntmytyndvyym.supabase.co
**Project Reference:** `uvxeykjlntmytyndvyym`

Follow these steps exactly - all commands are customized for your project!

---

## 📋 Step 1: Run SQL Scripts (15 minutes)

### 1.1: Get Your Anon Key First

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym
2. Click **Settings** (gear icon) → **API**
3. Find "Project API keys" section
4. Copy the **"anon public"** key (starts with `eyJhbG...`)
5. Save this key - you'll need it in Step 2

---

### 1.2: Run Base Schema

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/sql
   - Click **"New query"** button

2. **Run Base Schema**
   - Open the file: `/supabase/schema.sql` in your code editor
   - Press Ctrl+A (or Cmd+A) to select all
   - Press Ctrl+C (or Cmd+C) to copy
   - Go back to Supabase SQL Editor
   - Paste the entire contents
   - Click **"Run"** button (bottom right)
   - **Expected result:** `Success. No rows returned`

3. **Verify Base Tables**
   - Go to: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/editor
   - You should see these 9 tables:
     - ✅ accounts
     - ✅ ai_query_history
     - ✅ budgets
     - ✅ cash_flow_forecasts
     - ✅ integration_connections
     - ✅ recommendations
     - ✅ transactions
     - ✅ upcoming_events
     - ✅ user_profiles

---

### 1.3: Run QuickBooks Schema

1. **Create New Query**
   - In SQL Editor, click **"New query"** button again

2. **Run QuickBooks Schema**
   - Open the file: `/supabase/schema-quickbooks.sql` in your code editor
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - Go back to Supabase SQL Editor
   - Paste the entire contents
   - Click **"Run"** button
   - **Expected result:** `Success. No rows returned`

3. **Verify QuickBooks Tables**
   - Go to Table Editor
   - You should now see these ADDITIONAL tables:
     - ✅ sync_jobs
     - ✅ sync_errors
     - ✅ quickbooks_metadata
     - ✅ quickbooks_reports
     - ✅ ai_insights_cache
     - ✅ connection_logs
     - ✅ sync_frequency_options

4. **Test the Schema**
   - In SQL Editor, run this test query:
   ```sql
   SELECT * FROM sync_frequency_options;
   ```
   - **Expected result:** 4 rows (manual, daily, twice_daily, hourly)

✅ **If you see all tables and test query works, database setup is complete!**

---

## 📝 Step 2: Update Configuration File (2 minutes)

1. **Edit Configuration**
   - The file `/js/supabase-config.js` already has your project URL
   - You just need to add your anon key

2. **Update Anon Key**
   - Open `/js/supabase-config.js`
   - Replace `YOUR_SUPABASE_ANON_KEY_HERE` with the key you copied in Step 1.1
   - File should look like:
   ```javascript
   export const SUPABASE_URL = 'https://uvxeykjlntmytyndvyym.supabase.co'
   export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your actual key
   ```

3. **Save the file**

✅ **Configuration updated!**

---

## 🔐 Step 3: Set Up QuickBooks Developer Account (20 minutes)

### 3.1: Create Developer Account

1. Go to: https://developer.intuit.com/
2. Click **"Sign in"** (top right)
3. Sign in with your Intuit account or create a new one
4. Complete the developer profile if prompted

### 3.2: Create Your App

1. Go to: https://developer.intuit.com/app/developer/myapps
2. Click **"Create an app"** button
3. Select **"QuickBooks Online and Payments"**
4. Click **"Create app"**
5. Fill in:
   - **App name:** AI Virtual CFO
   - **Company:** Your company name
   - **Description:** AI-powered financial insights for QuickBooks
6. Click **"Create app"**

### 3.3: Get Your Credentials

1. Your app page should open automatically
2. Click **"Keys & OAuth"** tab (or go to: https://developer.intuit.com/app/developer/appdetail/APP_ID/keys)
3. You'll see two sections: **Sandbox keys** and **Production keys**

**For Development (use Sandbox keys):**
   - **Client ID** (starts with `AB...`) - Click to copy
   - **Client Secret** - Click "Show" then copy

**Save these values somewhere safe!** You'll need them in the next step.

### 3.4: Configure Redirect URI

Still on the "Keys & OAuth" page:

1. Scroll down to **"Redirect URIs"** section
2. Click **"Add URI"** button
3. Enter EXACTLY this URL:
   ```
   https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=callback
   ```
   ⚠️ **Important:** Copy this exactly - no trailing slashes!

4. Click **"Save"**
5. Verify the URI is now listed in the Redirect URIs section

### 3.5: Set Scopes

1. Still on same page, scroll to **"Scopes"** section
2. Make sure this is checked:
   - ✅ **Accounting** (com.intuit.quickbooks.accounting)
3. Click **"Save"** if you made any changes

✅ **QuickBooks Developer setup complete!**

---

## ⚙️ Step 4: Configure Supabase CLI & Secrets (15 minutes)

### 4.1: Install Supabase CLI

Open your terminal and run:

```bash
npm install -g supabase
```

Wait for installation to complete.

### 4.2: Login to Supabase

```bash
supabase login
```

- This will open a browser window
- Click "Authorize" to allow CLI access
- Return to terminal

### 4.3: Link Your Project

Navigate to your project directory:

```bash
cd /path/to/ai-virtual-cfo
```

Then link to your Supabase project:

```bash
supabase link --project-ref uvxeykjlntmytyndvyym
```

- You'll be prompted for your **database password**
- This is the password you created when you first created the Supabase project
- Enter it and press Enter

**Expected output:** `Linked to project uvxeykjlntmytyndvyym`

### 4.4: Set Secrets

Now set your QuickBooks credentials as secrets. Replace the placeholder values with your actual values from Step 3.3:

```bash
# QuickBooks Client ID (from Step 3.3 - starts with AB...)
supabase secrets set QUICKBOOKS_CLIENT_ID=YOUR_QB_CLIENT_ID_HERE

# QuickBooks Client Secret (from Step 3.3)
supabase secrets set QUICKBOOKS_CLIENT_SECRET=YOUR_QB_CLIENT_SECRET_HERE

# Redirect URI (this is exact - don't change)
supabase secrets set QUICKBOOKS_REDIRECT_URI=https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=callback

# Anthropic API Key (optional for now - get from https://console.anthropic.com)
# If you don't have this yet, you can set a placeholder:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-placeholder
```

**Example (with fake values - use your real ones):**
```bash
supabase secrets set QUICKBOOKS_CLIENT_ID=ABxxxxxxxxxxxxxxxxxxxx
supabase secrets set QUICKBOOKS_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set QUICKBOOKS_REDIRECT_URI=https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=callback
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### 4.5: Verify Secrets

```bash
supabase secrets list
```

**Expected output:** You should see 4 secrets listed:
- QUICKBOOKS_CLIENT_ID
- QUICKBOOKS_CLIENT_SECRET
- QUICKBOOKS_REDIRECT_URI
- ANTHROPIC_API_KEY

✅ **Secrets configured!**

---

## 🚀 Step 5: Deploy Edge Functions (10 minutes)

Now deploy all three Edge Functions to your Supabase project.

### 5.1: Deploy QuickBooks OAuth Function

```bash
supabase functions deploy quickbooks-oauth
```

**Expected output:**
```
Deploying function quickbooks-oauth...
Function quickbooks-oauth deployed successfully
```

### 5.2: Deploy QuickBooks Sync Function

```bash
supabase functions deploy quickbooks-sync
```

**Expected output:**
```
Deploying function quickbooks-sync...
Function quickbooks-sync deployed successfully
```

### 5.3: Deploy AI Query Function

```bash
supabase functions deploy ai-query
```

**Expected output:**
```
Deploying function ai-query...
Function ai-query deployed successfully
```

### 5.4: Verify Deployments

1. Go to: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/functions
2. You should see 3 functions:
   - ✅ **quickbooks-oauth** - Status: Active
   - ✅ **quickbooks-sync** - Status: Active
   - ✅ **ai-query** - Status: Active

### 5.5: Test Functions

Test that your OAuth function is responding:

```bash
curl https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=test
```

**Expected:** Some response (even if it's an error message - it means the function is deployed and responding)

✅ **All Edge Functions deployed!**

---

## ✅ Final Verification

Run through this checklist:

### Database Setup
- [ ] Ran `/supabase/schema.sql` successfully
- [ ] Ran `/supabase/schema-quickbooks.sql` successfully
- [ ] See 15+ tables in Table Editor
- [ ] Test query `SELECT * FROM sync_frequency_options;` returns 4 rows

### Configuration
- [ ] `/js/supabase-config.js` has correct URL: `https://uvxeykjlntmytyndvyym.supabase.co`
- [ ] `/js/supabase-config.js` has your anon key (not placeholder)

### QuickBooks Developer
- [ ] Developer account created
- [ ] App "AI Virtual CFO" created
- [ ] Client ID copied and saved
- [ ] Client Secret copied and saved
- [ ] Redirect URI configured: `https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=callback`
- [ ] Accounting scope selected

### Supabase CLI
- [ ] CLI installed (`npm install -g supabase`)
- [ ] Logged in (`supabase login`)
- [ ] Project linked (`supabase link --project-ref uvxeykjlntmytyndvyym`)
- [ ] All 4 secrets set (`supabase secrets list` shows them)

### Edge Functions
- [ ] `quickbooks-oauth` deployed
- [ ] `quickbooks-sync` deployed
- [ ] `ai-query` deployed
- [ ] All showing "Active" at: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/functions
- [ ] Test curl command returns response

---

## 🎉 Setup Complete!

If all checkboxes are checked, your QuickBooks integration backend is fully deployed and ready!

### What's Working Now

✅ **Database** - Ready to store QuickBooks data
✅ **OAuth Flow** - Can authenticate with QuickBooks
✅ **Sync Service** - Can fetch and sync QuickBooks data
✅ **AI Processing** - Ready to generate insights

### What's Next

**Phase 2: Frontend Integration** (Next 2 weeks)
- Add "Connect QuickBooks" button to your dashboard
- Implement OAuth flow in the UI
- Show connection status
- Display sync progress

---

## 🐛 Troubleshooting

### Error: "Failed to link project"

**Solution:**
```bash
# Make sure you're logged in
supabase login

# Try linking again with full URL
supabase link --project-ref uvxeykjlntmytyndvyym
```

### Error: "Failed to set secret"

**Solution:**
```bash
# Make sure project is linked first
supabase link --project-ref uvxeykjlntmytyndvyym

# Try setting secret again
supabase secrets set QUICKBOOKS_CLIENT_ID=YOUR_VALUE
```

### Error: "Function deployment failed"

**Solution:**
```bash
# Check you're in the right directory
cd /path/to/ai-virtual-cfo

# Verify project is linked
supabase link --project-ref uvxeykjlntmytyndvyym

# Deploy with verbose output
supabase functions deploy quickbooks-oauth --debug
```

### Error: OAuth "redirect_uri_mismatch"

**Problem:** QuickBooks shows error about redirect URI

**Solution:**
1. Go to QuickBooks Developer Portal
2. Check Redirect URIs section
3. Verify it EXACTLY matches: `https://uvxeykjlntmytyndvyym.supabase.co/functions/v1/quickbooks-oauth?action=callback`
4. No trailing slashes
5. No extra spaces
6. Click "Save"

---

## 📞 Need Help?

**Check Function Logs:**
```bash
# View logs for OAuth function
supabase functions logs quickbooks-oauth

# View logs for Sync function
supabase functions logs quickbooks-sync

# View logs for AI function
supabase functions logs ai-query
```

**Check Database:**
- Go to: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/editor
- Click on tables to see data
- Use SQL Editor to run test queries

**Quick Links:**
- Your Supabase Dashboard: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym
- Your Edge Functions: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/functions
- Your Database Tables: https://supabase.com/dashboard/project/uvxeykjlntmytyndvyym/editor
- QuickBooks Developer Portal: https://developer.intuit.com/app/developer/myapps

---

**Ready to start? Begin with Step 1: Run the SQL Scripts!** 🚀

All commands in this guide are already customized for your project. Just copy and paste!
