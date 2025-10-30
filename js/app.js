// Main Application Entry Point
import * as SupabaseClient from './supabase-client.js'

// Global state
let currentUser = null
let authModal = null
let cashFlowChart = null
let revenueChart = null
let expensesChart = null

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Bootstrap modal
  authModal = new bootstrap.Modal(document.getElementById('authModal'))

  // Setup auth event listeners
  setupAuthListeners()

  // Check if user is already logged in
  await checkAuthentication()
})

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuthentication() {
  showLoading(true)

  currentUser = await SupabaseClient.getCurrentUser()

  if (currentUser) {
    // User is authenticated
    await initializeDashboard(currentUser.id)
    showDashboard()
  } else {
    // User not authenticated, show login modal
    authModal.show()
  }

  showLoading(false)
}

function setupAuthListeners() {
  // Toggle between login and signup
  document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('loginForm').classList.add('d-none')
    document.getElementById('signupForm').classList.remove('d-none')
  })

  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault()
    document.getElementById('signupForm').classList.add('d-none')
    document.getElementById('loginForm').classList.remove('d-none')
  })

  // Login button
  document.getElementById('loginButton').addEventListener('click', handleLogin)

  // Allow Enter key in login form
  document.getElementById('loginEmail').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin()
  })
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin()
  })

  // Signup button
  document.getElementById('signupButton').addEventListener('click', handleSignup)

  // Logout button
  document.getElementById('logoutButton').addEventListener('click', handleLogout)
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim()
  const password = document.getElementById('loginPassword').value

  if (!email || !password) {
    showError('loginError', 'Please enter both email and password')
    return
  }

  showLoading(true)

  const { user, error } = await SupabaseClient.signIn(email, password)

  if (error) {
    showError('loginError', error)
    showLoading(false)
    return
  }

  if (user) {
    currentUser = user
    authModal.hide()
    await initializeDashboard(user.id)
    showDashboard()
  }

  showLoading(false)
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim()
  const password = document.getElementById('signupPassword').value
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value
  const companyName = document.getElementById('signupCompany').value.trim()

  // Validation
  if (!email || !password) {
    showError('signupError', 'Please enter email and password')
    return
  }

  if (password.length < 6) {
    showError('signupError', 'Password must be at least 6 characters')
    return
  }

  if (password !== passwordConfirm) {
    showError('signupError', 'Passwords do not match')
    return
  }

  showLoading(true)

  const { user, error } = await SupabaseClient.signUp(email, password, companyName)

  if (error) {
    showError('signupError', error)
    showLoading(false)
    return
  }

  // Show success message
  document.getElementById('signupError').classList.add('d-none')
  const successEl = document.getElementById('signupSuccess')
  successEl.textContent = 'Account created successfully! Please check your email to confirm your account, then sign in.'
  successEl.classList.remove('d-none')

  // Clear form
  document.getElementById('signupEmail').value = ''
  document.getElementById('signupPassword').value = ''
  document.getElementById('signupPasswordConfirm').value = ''
  document.getElementById('signupCompany').value = ''

  // Switch to login form after 3 seconds
  setTimeout(() => {
    document.getElementById('signupForm').classList.add('d-none')
    document.getElementById('loginForm').classList.remove('d-none')
    successEl.classList.add('d-none')
  }, 3000)

  showLoading(false)
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await SupabaseClient.signOut()
  }
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

async function initializeDashboard(userId) {
  try {
    // Update user profile
    document.getElementById('userEmail').textContent = currentUser.email

    // Load all dashboard data in parallel
    await Promise.all([
      loadDashboardSummary(userId),
      loadFinancialHealthScore(userId),
      loadCashFlowChart(userId),
      loadRevenueChart(userId),
      loadExpensesChart(userId),
      loadUpcomingEvents(userId),
      loadRecommendations(userId)
    ])

    // Setup AI assistant
    setupAIAssistant(userId)

    // Setup real-time subscriptions
    setupRealTimeSubscriptions(userId)

  } catch (error) {
    console.error('Error initializing dashboard:', error)
    alert('Error loading dashboard data. Please refresh the page.')
  }
}

// ============================================
// DASHBOARD DATA LOADING
// ============================================

async function loadDashboardSummary(userId) {
  const summary = await SupabaseClient.getDashboardSummary(userId)

  document.getElementById('cashPosition').textContent = SupabaseClient.formatCurrency(summary.cashPosition)
  document.getElementById('monthlyRevenue').textContent = SupabaseClient.formatCurrency(summary.monthlyRevenue)
  document.getElementById('monthlyExpenses').textContent = SupabaseClient.formatCurrency(summary.monthlyExpenses)
  document.getElementById('profitMargin').textContent = summary.profitMargin + '%'
}

async function loadFinancialHealthScore(userId) {
  const score = await SupabaseClient.getFinancialHealthScore(userId)

  if (!score || !score.overall_score) {
    console.log('No health score data available')
    return
  }

  // Update overall score
  const overallScore = score.overall_score
  const overallBar = document.getElementById('overallScoreBar')
  overallBar.style.width = overallScore + '%'
  overallBar.textContent = overallScore + '/100'
  overallBar.className = 'progress-bar ' + getScoreColor(overallScore)

  // Update sub-metrics
  updateHealthBar('liquidityBar', score.liquidity)
  updateHealthBar('profitabilityBar', score.profitability)
  updateHealthBar('efficiencyBar', score.efficiency)
  updateHealthBar('growthBar', score.growth)
}

function updateHealthBar(barId, value) {
  const bar = document.getElementById(barId)
  bar.style.width = value + '%'
  bar.textContent = value + '%'
  bar.className = 'progress-bar ' + getScoreColor(value)
}

function getScoreColor(score) {
  if (score >= 80) return 'bg-success'
  if (score >= 60) return 'bg-info'
  if (score >= 40) return 'bg-warning'
  return 'bg-danger'
}

async function loadCashFlowChart(userId) {
  const forecasts = await SupabaseClient.getCashFlowForecast(userId, 90)

  if (!forecasts || forecasts.length === 0) {
    console.log('No forecast data available')
    return
  }

  const labels = forecasts.map(f => SupabaseClient.formatDate(f.forecast_date))
  const cashIn = forecasts.map(f => parseFloat(f.predicted_cash_in))
  const cashOut = forecasts.map(f => parseFloat(f.predicted_cash_out))
  const netCashFlow = forecasts.map(f => parseFloat(f.predicted_cash_in) - parseFloat(f.predicted_cash_out))

  const ctx = document.getElementById('cashFlowChart').getContext('2d')

  // Destroy existing chart if it exists
  if (cashFlowChart) {
    cashFlowChart.destroy()
  }

  cashFlowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cash In',
          data: cashIn,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4
        },
        {
          label: 'Cash Out',
          data: cashOut,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.4
        },
        {
          label: 'Net Cash Flow',
          data: netCashFlow,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 12
          }
        }
      }
    }
  })
}

async function loadRevenueChart(userId) {
  const breakdown = await SupabaseClient.getRevenueBreakdown(userId, 30)

  if (!breakdown || Object.keys(breakdown).length === 0) {
    console.log('No revenue data available')
    return
  }

  const labels = Object.keys(breakdown)
  const data = Object.values(breakdown).map(v => parseFloat(v))

  const ctx = document.getElementById('revenueChart').getContext('2d')

  // Destroy existing chart if it exists
  if (revenueChart) {
    revenueChart.destroy()
  }

  revenueChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })
}

async function loadExpensesChart(userId) {
  const breakdown = await SupabaseClient.getExpenseBreakdown(userId, 30)

  if (!breakdown || Object.keys(breakdown).length === 0) {
    console.log('No expense data available')
    return
  }

  const labels = Object.keys(breakdown)
  const data = Object.values(breakdown).map(v => parseFloat(v))

  const ctx = document.getElementById('expensesChart').getContext('2d')

  // Destroy existing chart if it exists
  if (expensesChart) {
    expensesChart.destroy()
  }

  expensesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })
}

async function loadUpcomingEvents(userId) {
  const events = await SupabaseClient.getUpcomingEvents(userId, 10)

  const listEl = document.getElementById('upcomingEventsList')

  if (!events || events.length === 0) {
    listEl.innerHTML = '<li class="list-group-item text-center text-muted"><em>No upcoming events</em></li>'
    return
  }

  listEl.innerHTML = events.map(event => {
    const daysUntil = SupabaseClient.calculateDaysUntil(event.event_date)
    const badgeClass = getPriorityBadgeClass(event.priority)

    return `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="badge ${badgeClass} me-2">${event.priority}</span>
          ${event.title}
        </div>
        <span>${daysUntil} days</span>
      </li>
    `
  }).join('')
}

function getPriorityBadgeClass(priority) {
  const map = {
    'urgent': 'bg-danger',
    'important': 'bg-warning',
    'upcoming': 'bg-info',
    'low': 'bg-secondary'
  }
  return map[priority] || 'bg-secondary'
}

async function loadRecommendations(userId) {
  const recommendations = await SupabaseClient.getRecommendations(userId)

  const listEl = document.getElementById('recommendationsList')

  if (!recommendations || recommendations.length === 0) {
    listEl.innerHTML = '<div class="list-group-item text-center text-muted"><em>No recommendations available</em></div>'
    return
  }

  listEl.innerHTML = recommendations.map(rec => {
    const impactClass = rec.impact_level === 'high' ? 'text-success' : 'text-primary'

    return `
      <a href="#" class="list-group-item list-group-item-action" data-rec-id="${rec.id}">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${rec.title}</h6>
          <small class="${impactClass}">${rec.impact_level} Impact</small>
        </div>
        <p class="mb-1">${rec.description}</p>
        ${rec.estimated_savings ? `<small class="text-success">Potential savings: ${SupabaseClient.formatCurrency(rec.estimated_savings)}</small>` : ''}
      </a>
    `
  }).join('')
}

// ============================================
// AI ASSISTANT
// ============================================

function setupAIAssistant(userId) {
  const sendButton = document.getElementById('sendButton')
  const messageInput = document.getElementById('userMessage')

  sendButton.addEventListener('click', () => handleAIQuery(userId))
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAIQuery(userId)
  })
}

async function handleAIQuery(userId) {
  const input = document.getElementById('userMessage')
  const responseEl = document.getElementById('aiResponse')
  const query = input.value.trim()

  if (!query) return

  // Show loading state
  responseEl.innerHTML = '<div class="alert alert-info"><em>Thinking...</em></div>'

  // Clear input
  input.value = ''

  try {
    const { response, error } = await SupabaseClient.queryAI(userId, query)

    if (error) {
      responseEl.innerHTML = `<div class="alert alert-danger">${error}</div>`
      return
    }

    responseEl.innerHTML = `<div class="alert alert-success">${response}</div>`
  } catch (error) {
    console.error('AI query error:', error)
    responseEl.innerHTML = '<div class="alert alert-danger">Sorry, I encountered an error. Please try again.</div>'
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

function setupRealTimeSubscriptions(userId) {
  // Subscribe to transaction changes
  SupabaseClient.subscribeToTransactions(userId, (payload) => {
    console.log('Transaction changed:', payload)
    // Refresh dashboard data
    loadDashboardSummary(userId)
    loadCashFlowChart(userId)
  })

  // Subscribe to recommendation changes
  SupabaseClient.subscribeToRecommendations(userId, (payload) => {
    console.log('Recommendation changed:', payload)
    loadRecommendations(userId)
  })
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showDashboard() {
  document.getElementById('mainContent').style.display = 'block'
}

function showLoading(show) {
  const authForms = document.getElementById('authModal').querySelector('.modal-body')
  const loadingEl = document.getElementById('authLoading')

  if (show) {
    Array.from(authForms.children).forEach(child => {
      if (child.id !== 'authLoading') child.classList.add('d-none')
    })
    loadingEl.classList.remove('d-none')
  } else {
    loadingEl.classList.add('d-none')
  }
}

function showError(elementId, message) {
  const errorEl = document.getElementById(elementId)
  errorEl.textContent = message
  errorEl.classList.remove('d-none')

  // Hide after 5 seconds
  setTimeout(() => {
    errorEl.classList.add('d-none')
  }, 5000)
}
