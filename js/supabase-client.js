// Supabase Client Integration for AI Virtual CFO
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js'

// Initialize Supabase client
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Export for use in other modules
window.supabaseClient = supabaseClient

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export async function signUp(email, password, companyName = '') {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          company_name: companyName
        }
      }
    })

    if (error) throw error

    // Create user profile
    if (data.user) {
      await createUserProfile(data.user.id, companyName)
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error('Signup error:', error)
    return { user: null, error: error.message }
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    })

    if (error) throw error

    return { user: data.user, session: data.session, error: null }
  } catch (error) {
    console.error('Login error:', error)
    return { user: null, session: null, error: error.message }
  }
}

export async function signOut() {
  try {
    const { error } = await supabaseClient.auth.signOut()
    if (error) throw error

    // Redirect to login
    window.location.reload()
    return { error: null }
  } catch (error) {
    console.error('Logout error:', error)
    return { error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

export async function resetPassword(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email)
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Reset password error:', error)
    return { error: error.message }
  }
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

async function createUserProfile(userId, companyName) {
  try {
    const { error } = await supabaseClient
      .from('user_profiles')
      .insert([
        {
          id: userId,
          company_name: companyName,
          created_at: new Date().toISOString()
        }
      ])

    if (error) throw error
  } catch (error) {
    console.error('Create profile error:', error)
  }
}

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get profile error:', error)
    return null
  }
}

// ============================================
// DASHBOARD DATA FUNCTIONS
// ============================================

export async function getDashboardSummary(userId) {
  try {
    // Get cash position
    const { data: cashAccounts } = await supabaseClient
      .from('accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('account_type', 'cash')
      .eq('is_active', true)

    const cashPosition = cashAccounts?.reduce((sum, acc) => sum + parseFloat(acc.balance), 0) || 0

    // Get monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: revenueData } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'income')
      .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

    const monthlyRevenue = revenueData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0

    // Get monthly expenses (last 30 days)
    const { data: expenseData } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

    const monthlyExpenses = Math.abs(expenseData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0)

    // Calculate profit margin
    const profitMargin = monthlyRevenue > 0
      ? ((monthlyRevenue - monthlyExpenses) / monthlyRevenue * 100).toFixed(1)
      : 0

    return {
      cashPosition,
      monthlyRevenue,
      monthlyExpenses,
      profitMargin
    }
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return {
      cashPosition: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0,
      profitMargin: 0
    }
  }
}

export async function getFinancialHealthScore(userId) {
  try {
    const { data, error } = await supabaseClient
      .rpc('calculate_health_score', { p_user_id: userId })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get health score error:', error)
    return {
      overall_score: 0,
      liquidity: 0,
      profitability: 0,
      efficiency: 0,
      growth: 0
    }
  }
}

// ============================================
// CASH FLOW FUNCTIONS
// ============================================

export async function getCashFlowForecast(userId, days = 90) {
  try {
    const { data, error } = await supabaseClient
      .from('cash_flow_forecasts')
      .select('*')
      .eq('user_id', userId)
      .gte('forecast_date', new Date().toISOString().split('T')[0])
      .order('forecast_date', { ascending: true })
      .limit(days)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get cash flow forecast error:', error)
    return []
  }
}

// ============================================
// REVENUE & EXPENSE FUNCTIONS
// ============================================

export async function getRevenueBreakdown(userId, days = 30) {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_revenue_breakdown', { p_user_id: userId, p_days: days })

    if (error) throw error
    return data || {}
  } catch (error) {
    console.error('Get revenue breakdown error:', error)
    return {}
  }
}

export async function getExpenseBreakdown(userId, days = 30) {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_expense_breakdown', { p_user_id: userId, p_days: days })

    if (error) throw error
    return data || {}
  } catch (error) {
    console.error('Get expense breakdown error:', error)
    return {}
  }
}

// ============================================
// TRANSACTIONS FUNCTIONS
// ============================================

export async function getRecentTransactions(userId, limit = 10) {
  try {
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get transactions error:', error)
    return []
  }
}

export async function addTransaction(userId, transaction) {
  try {
    const { data, error } = await supabaseClient
      .from('transactions')
      .insert([
        {
          user_id: userId,
          account_id: transaction.accountId,
          amount: transaction.amount,
          category: transaction.category,
          subcategory: transaction.subcategory,
          description: transaction.description,
          transaction_date: transaction.date,
          transaction_type: transaction.type,
          payment_method: transaction.paymentMethod
        }
      ])
      .select()

    if (error) throw error
    return { data: data[0], error: null }
  } catch (error) {
    console.error('Add transaction error:', error)
    return { data: null, error: error.message }
  }
}

// ============================================
// RECOMMENDATIONS FUNCTIONS
// ============================================

export async function getRecommendations(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get recommendations error:', error)
    return []
  }
}

export async function updateRecommendationStatus(recommendationId, status) {
  try {
    const { error } = await supabaseClient
      .from('recommendations')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', recommendationId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Update recommendation error:', error)
    return { error: error.message }
  }
}

// ============================================
// UPCOMING EVENTS FUNCTIONS
// ============================================

export async function getUpcomingEvents(userId, limit = 10) {
  try {
    const { data, error } = await supabaseClient
      .from('upcoming_events')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get upcoming events error:', error)
    return []
  }
}

// ============================================
// AI ASSISTANT FUNCTIONS
// ============================================

export async function queryAI(userId, query) {
  try {
    // Call the Edge Function
    const { data, error } = await supabaseClient.functions.invoke('ai-query', {
      body: { query: query }
    })

    if (error) throw error
    return { response: data.response, error: null }
  } catch (error) {
    console.error('AI query error:', error)
    return {
      response: 'I apologize, but I encountered an error processing your request. Please try again.',
      error: error.message
    }
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToTransactions(userId, callback) {
  return supabaseClient
    .channel('transactions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export function subscribeToRecommendations(userId, callback) {
  return supabaseClient
    .channel('recommendations_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recommendations',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export function unsubscribeAll() {
  supabaseClient.removeAllChannels()
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function calculateDaysUntil(dateString) {
  const targetDate = new Date(dateString)
  const today = new Date()
  const diffTime = targetDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
