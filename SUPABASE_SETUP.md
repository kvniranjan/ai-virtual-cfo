# Supabase Setup Guide for AI Virtual CFO

This guide will walk you through setting up Supabase for your AI Virtual CFO application.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the details:
   - **Project Name**: ai-virtual-cfo
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
5. Click "Create new project" (takes ~2 minutes to provision)

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)

## Step 3: Configure Your Application

1. Create a file named `js/supabase-config.js` in your project
2. Add your credentials:

```javascript
// DO NOT commit this file to git if using real credentials
// For production, use environment variables

export const SUPABASE_URL = 'YOUR_PROJECT_URL'
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
```

3. Add to `.gitignore`:
```
js/supabase-config.js
```

## Step 4: Run Database Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/schema.sql` from this project
4. Click **Run** to execute the schema
5. Verify tables were created: Go to **Table Editor** to see your tables

## Step 5: Set Up Row Level Security (RLS) Policies

The schema includes RLS policies, but verify they're enabled:

1. Go to **Authentication** → **Policies**
2. Check that policies exist for:
   - accounts
   - transactions
   - cash_flow_forecasts
   - recommendations

## Step 6: Deploy Edge Functions (Optional - for AI features)

### Install Supabase CLI

```bash
npm install -g supabase
```

### Login to Supabase

```bash
supabase login
```

### Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

(Find your project ref in Project Settings → General)

### Deploy AI Query Function

```bash
cd supabase/functions
supabase functions deploy ai-query
```

### Set Environment Variables for Edge Functions

```bash
supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key
```

## Step 7: Test Your Setup

1. Open `index.html` in a browser
2. You should see a login/signup form
3. Create a test account
4. Once logged in, you should see the dashboard
5. Try adding some test data

## Troubleshooting

### "Failed to fetch" errors
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Verify you're using HTTPS (not HTTP)
- Check browser console for CORS errors

### Authentication not working
- Verify email confirmation is disabled for testing: Authentication → Settings → Enable email confirmations (toggle OFF for development)
- Check that RLS policies are properly set up

### Data not showing
- Verify you're logged in (check `supabase.auth.getUser()`)
- Check that user_id matches in database
- Verify RLS policies allow the user to read data

### Edge Functions timing out
- Check function logs: `supabase functions logs ai-query`
- Verify ANTHROPIC_API_KEY is set: `supabase secrets list`
- Increase timeout if needed

## Production Checklist

Before deploying to production:

- [ ] Enable email confirmation for new users
- [ ] Set up custom SMTP for emails (Authentication → Settings → SMTP)
- [ ] Review and tighten RLS policies
- [ ] Enable MFA for admin accounts
- [ ] Set up database backups
- [ ] Configure custom domain
- [ ] Set up monitoring and alerts
- [ ] Review and optimize Edge Functions
- [ ] Enable rate limiting
- [ ] Set up error tracking (Sentry, etc.)

## Useful Commands

```bash
# View real-time logs
supabase functions logs ai-query --follow

# Run Edge Function locally
supabase functions serve ai-query

# Reset local database
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > types/supabase.ts
```

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## Next Steps

After setup is complete:

1. Populate test data (see `supabase/seed.sql`)
2. Customize the dashboard with your branding
3. Set up third-party integrations (QuickBooks, etc.)
4. Configure backup and monitoring
5. Deploy to production hosting
