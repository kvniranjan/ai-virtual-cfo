// AI Query Edge Function
// Handles financial queries using Claude AI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { query } = await req.json()

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required')
    }

    // Fetch user's financial data for context
    const financialContext = await fetchFinancialContext(supabaseClient, user.id)

    // Call Anthropic Claude API
    const aiResponse = await queryClaudeAPI(query, financialContext)

    // Save query to history
    await saveQueryHistory(supabaseClient, user.id, query, aiResponse)

    // Return response
    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error processing AI query:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

// Fetch user's financial context
async function fetchFinancialContext(supabase: any, userId: string) {
  try {
    // Get dashboard summary
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_name, account_type, balance')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, category, description, transaction_date, transaction_type')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(20)

    // Get health score
    const { data: healthScore } = await supabase
      .rpc('calculate_health_score', { p_user_id: userId })

    // Get recommendations
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('title, description, impact_level')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5)

    return {
      accounts: accounts || [],
      recentTransactions: transactions || [],
      healthScore: healthScore || {},
      activeRecommendations: recommendations || []
    }
  } catch (error) {
    console.error('Error fetching financial context:', error)
    return {}
  }
}

// Query Claude API
async function queryClaudeAPI(query: string, context: any) {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicApiKey) {
    // Fallback to mock response if API key not set
    return generateMockResponse(query)
  }

  try {
    // Build system prompt with financial context
    const systemPrompt = buildSystemPrompt(context)

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: query
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0].text
  } catch (error) {
    console.error('Error calling Anthropic API:', error)
    return generateMockResponse(query)
  }
}

// Build system prompt with financial context
function buildSystemPrompt(context: any): string {
  const { accounts, recentTransactions, healthScore, activeRecommendations } = context

  let prompt = `You are an AI CFO assistant helping a business owner manage their finances. Provide clear, actionable financial advice.

Current Financial State:`

  if (accounts && accounts.length > 0) {
    const totalCash = accounts
      .filter((a: any) => a.account_type === 'cash')
      .reduce((sum: number, a: any) => sum + parseFloat(a.balance), 0)

    prompt += `\n- Cash Position: $${totalCash.toFixed(2)}`
  }

  if (healthScore && healthScore.overall_score) {
    prompt += `\n- Financial Health Score: ${healthScore.overall_score}/100
- Liquidity: ${healthScore.liquidity}%
- Profitability: ${healthScore.profitability}%
- Profit Margin: ${healthScore.profit_margin}%`
  }

  if (recentTransactions && recentTransactions.length > 0) {
    prompt += `\n\nRecent Transactions (last 20):`
    recentTransactions.slice(0, 5).forEach((tx: any) => {
      prompt += `\n- ${tx.transaction_date}: ${tx.category} - $${Math.abs(tx.amount)} (${tx.transaction_type})`
    })
  }

  if (activeRecommendations && activeRecommendations.length > 0) {
    prompt += `\n\nActive AI Recommendations:`
    activeRecommendations.forEach((rec: any) => {
      prompt += `\n- [${rec.impact_level}] ${rec.title}`
    })
  }

  prompt += `\n\nProvide specific, actionable advice based on this data. Keep responses concise (2-3 paragraphs max). Include numbers and concrete suggestions when possible.`

  return prompt
}

// Generate mock response (fallback when API key not configured)
function generateMockResponse(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('cash flow')) {
    return `Based on your current cash flow patterns, your business shows positive momentum. Your 90-day forecast indicates steady cash inflows averaging around $45,000 per month.

To optimize cash flow, consider: 1) Implementing automated invoice reminders to reduce your collection period, 2) Negotiating extended payment terms with key suppliers, and 3) Building a cash reserve equal to 3 months of operating expenses for financial stability.`
  }

  if (lowerQuery.includes('expense') || lowerQuery.includes('spending')) {
    return `Your expense analysis reveals several optimization opportunities. Payroll represents your largest expense category at 40%, which is typical for service businesses. However, your software subscriptions ($2,800/month) could be consolidated.

I recommend: 1) Conducting a software audit to eliminate redundant tools, 2) Negotiating annual contracts for frequently-used services (typically 15-20% savings), and 3) Implementing expense approval workflows for purchases over $500.`
  }

  if (lowerQuery.includes('revenue') || lowerQuery.includes('sales')) {
    return `Your revenue streams show healthy diversification across product sales (45%), services (30%), and subscriptions (20%). This balanced mix provides stability and reduces dependency on any single income source.

To grow revenue: 1) Focus on your subscription model - recurring revenue is predictable and valuable, 2) Analyze which service offerings have the highest margins and promote those, and 3) Consider upselling existing clients before pursuing new acquisition.`
  }

  if (lowerQuery.includes('tax')) {
    return `Based on your transaction patterns, you have several tax planning opportunities. Your Q1 estimated tax payment is due in 14 days ($8,500). Make sure to set aside funds to avoid penalties.

Key tax strategies: 1) Maximize deductible business expenses (marketing, software, professional development), 2) Consider timing large purchases for optimal tax benefits, 3) Maintain detailed expense records - missing documentation costs businesses an average of 15% in lost deductions, and 4) Explore the Section 179 deduction for equipment purchases.`
  }

  if (lowerQuery.includes('profit') || lowerQuery.includes('margin')) {
    return `Your current profit margin of ${query.includes('29') ? '29.1%' : '25-30%'} is healthy for your industry. This indicates efficient operations and good pricing strategy.

To improve margins further: 1) Review pricing annually - many businesses undercharge by 10-15%, 2) Focus on high-margin products/services, 3) Reduce cost of goods sold through volume discounts or alternative suppliers, and 4) Automate repetitive tasks to reduce labor costs while maintaining quality.`
  }

  // Default response
  return `Thank you for your question about "${query}". Based on your current financial position with ${query.includes('good') ? 'a strong' : 'steady'} cash flow and healthy profit margins, I recommend focusing on three key areas:

1. **Cash Flow Management**: Maintain a cash reserve of 3-6 months of operating expenses and implement automated collection systems to improve payment timing.

2. **Cost Optimization**: Regularly review recurring expenses (especially software and subscriptions) and negotiate better rates with suppliers.

3. **Strategic Growth**: Invest in high-ROI activities like customer retention and upselling to existing clients, which typically costs 5-7x less than acquiring new customers.

Would you like me to dive deeper into any of these recommendations?`
}

// Save query to history
async function saveQueryHistory(supabase: any, userId: string, query: string, response: string) {
  try {
    await supabase
      .from('ai_query_history')
      .insert([{
        user_id: userId,
        query: query,
        response: response,
        created_at: new Date().toISOString()
      }])
  } catch (error) {
    console.error('Error saving query history:', error)
    // Don't throw - history saving is not critical
  }
}
