# Supabase Integration - Quick Start

Get your AI Virtual CFO up and running with Supabase in 15 minutes!

## 📋 What You'll Need

- A Supabase account (free): https://supabase.com
- A web browser
- (Optional) Anthropic API key for real AI: https://console.anthropic.com

## 🚀 Quick Setup (5 Steps)

### Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - Name: `ai-virtual-cfo`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
4. Click "Create new project"
5. Wait ~2 minutes for provisioning

### Step 2: Get Your Credentials (1 min)

1. In your Supabase dashboard, click **Settings** (gear icon)
2. Go to **API** section
3. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...` (long string)

### Step 3: Configure Your App (1 min)

1. Open `js/supabase-config.js`
2. Replace the placeholder values:

```javascript
export const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co'  // ← Paste here
export const SUPABASE_ANON_KEY = 'eyJhbG...'  // ← Paste here
```

3. Save the file

### Step 4: Set Up Database (5 min)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `/supabase/schema.sql` from this project
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** (bottom right)
7. Wait for "Success. No rows returned" message

**Verify**: Go to **Table Editor** - you should see these tables:
- accounts
- transactions
- cash_flow_forecasts
- recommendations
- upcoming_events
- user_profiles

### Step 5: Test Your App (2 min)

1. Open `index.html` in your web browser
2. Click "Sign up" on the login modal
3. Create a test account:
   - Email: test@example.com
   - Password: test123456
4. Sign in with your new account
5. You should see the dashboard!

**Note**: Dashboard will be empty initially. Add test data in next step.

## 📊 Add Test Data (Optional)

To see the dashboard with data:

1. Get your user ID:
   - In Supabase, go to **SQL Editor**
   - Run: `SELECT id, email FROM auth.users;`
   - Copy your user ID (looks like: `123e4567-e89b-12d3-a456-426614174000`)

2. Add test data:
   - Open `/supabase/seed.sql`
   - Replace ALL instances of `YOUR_USER_ID` with your actual ID
   - Copy the modified SQL
   - Paste in Supabase SQL Editor
   - Click **Run**

3. Refresh your dashboard - you should now see:
   - Cash position: $67,750
   - Monthly revenue: $38,500
   - 90-day cash flow forecast
   - Revenue/expense charts
   - Recommendations
   - Upcoming events

## 🤖 Enable Real AI (Optional)

By default, the app uses mock AI responses. For real Claude AI:

### Get Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up/login
3. Go to **API Keys**
4. Create a new key
5. Copy the key (starts with `sk-ant-...`)

### Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Set API key as secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here

# Deploy function
supabase functions deploy ai-query
```

### Test Real AI

1. Open your dashboard
2. In AI Assistant box, type: "How is my cash flow?"
3. Click Send
4. Wait 2-5 seconds for response
5. You should get a detailed, context-aware answer!

## 🎯 What's Working Now

✅ **Authentication**
- Sign up / Sign in
- Email/password
- JWT tokens
- Session management

✅ **Dashboard**
- Real-time financial metrics
- Cash flow forecasting
- Revenue/expense analytics
- Financial health score

✅ **AI Assistant**
- Natural language queries
- Financial context awareness
- Smart recommendations

✅ **Database**
- PostgreSQL with full ACID
- Row Level Security
- Real-time subscriptions
- Automatic backups

✅ **Security**
- Secure authentication
- User data isolation
- HTTPS encryption

## 📁 Project Structure

```
ai-virtual-cfo/
├── index.html              # Main dashboard (now with auth)
├── js/
│   ├── supabase-config.js  # Your credentials (gitignored)
│   ├── supabase-client.js  # Database functions
│   ├── app.js              # Main application logic
│   └── scripts.js          # Original charts (deprecated)
├── supabase/
│   ├── schema.sql          # Database tables & functions
│   ├── seed.sql            # Test data
│   └── functions/
│       └── ai-query/       # Edge Function for AI
└── css/
    └── styles.css          # Your existing styles
```

## 🐛 Troubleshooting

### Login not working?

1. Check `js/supabase-config.js` has correct URL and key
2. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check browser console for errors (F12)

### Dashboard shows no data?

1. You need to add test data (see "Add Test Data" above)
2. Check you're using the correct user_id in seed.sql

### AI not responding?

1. Without Edge Function: Should show mock responses instantly
2. With Edge Function: Check `supabase functions logs ai-query`
3. Verify ANTHROPIC_API_KEY is set: `supabase secrets list`

### "Failed to fetch" errors?

1. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
2. Check you're using HTTPS (not HTTP)
3. Clear browser cache and try again

## 📚 Next Steps

Now that Supabase is integrated:

1. **Customize the dashboard** - Modify `index.html` and `css/styles.css`
2. **Add more features** - Use `js/supabase-client.js` functions
3. **Connect accounting software** - QuickBooks, Xero integration
4. **Deploy to production** - Vercel, Netlify, or your own hosting
5. **Set up domain** - Configure custom domain in Supabase

## 📖 More Documentation

- **Detailed Setup**: See `SUPABASE_SETUP.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Supabase Docs**: https://supabase.com/docs
- **Claude AI Docs**: https://docs.anthropic.com

## ✅ Success Checklist

- [ ] Supabase project created
- [ ] Credentials added to `js/supabase-config.js`
- [ ] Database schema deployed
- [ ] Can sign up / sign in
- [ ] Dashboard loads
- [ ] Test data added
- [ ] Charts rendering
- [ ] AI assistant responding

**If all checked:** Congratulations! 🎉 Your AI Virtual CFO is now powered by Supabase!

## 💡 Tips

- **Development**: Disable email confirmation in Supabase → Authentication → Settings
- **Production**: Enable email confirmation and set up custom SMTP
- **Security**: Never commit `js/supabase-config.js` with real credentials
- **Performance**: Use indexes on frequently queried columns
- **Cost**: Free tier includes 500MB database - plenty for starting out

## 🆘 Need Help?

- Check browser console (F12 → Console)
- Check Supabase logs (Dashboard → Logs)
- Review error messages carefully
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

---

**You're all set!** Start exploring your financial dashboard. Happy CFO-ing! 💰📈
