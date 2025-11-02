// QuickBooks Data Sync Service
// Fetches financial data from QuickBooks and syncs to our database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { integration_id, sync_type } = await req.json()

    // Get integration details
    const { data: integration } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      throw new Error('Integration not found')
    }

    // Create sync job
    const { data: syncJob } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: user.id,
        integration_id: integration_id,
        sync_type: sync_type || 'manual',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    // Perform sync
    try {
      const result = await performSync(supabase, user.id, integration, syncJob.id)

      // Update sync job as completed
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_synced: result.recordsSynced,
          errors_count: result.errorsCount
        })
        .eq('id', syncJob.id)

      // Update integration last_sync
      await supabase.rpc('update_last_sync', { p_integration_id: integration_id })

      return new Response(
        JSON.stringify({
          success: true,
          syncJob: syncJob.id,
          recordsSynced: result.recordsSynced,
          errorsCount: result.errorsCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      // Update sync job as failed
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', syncJob.id)

      throw error
    }
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ============================================
// SYNC LOGIC
// ============================================

async function performSync(supabase: any, userId: string, integration: any, syncJobId: string) {
  let recordsSynced = 0
  let errorsCount = 0

  const realmId = integration.realm_id
  const accessToken = integration.access_token

  // Check if token is expired
  const tokenExpiry = new Date(integration.token_expires_at)
  if (tokenExpiry < new Date()) {
    // Token expired, refresh it
    // This should be handled by a separate refresh mechanism
    throw new Error('Access token expired. Please refresh.')
  }

  try {
    // 1. Sync Chart of Accounts
    console.log('Syncing Chart of Accounts...')
    const accountsResult = await syncAccounts(supabase, userId, integration.id, accessToken, realmId)
    recordsSynced += accountsResult.synced
    errorsCount += accountsResult.errors

    // 2. Sync Transactions (last 12 months)
    console.log('Syncing Transactions...')
    const transactionsResult = await syncTransactions(supabase, userId, integration.id, accessToken, realmId)
    recordsSynced += transactionsResult.synced
    errorsCount += transactionsResult.errors

    // 3. Fetch and cache financial reports
    console.log('Fetching Financial Reports...')
    await cacheFinancialReports(supabase, userId, integration.id, accessToken, realmId)

    // 4. Store company metadata
    console.log('Storing Company Metadata...')
    await storeCompanyMetadata(supabase, userId, integration.id, accessToken, realmId)

  } catch (error) {
    console.error('Sync error:', error)
    // Log error
    await supabase.from('sync_errors').insert({
      sync_job_id: syncJobId,
      user_id: userId,
      error_type: 'sync_error',
      error_message: error.message,
      error_details: { stack: error.stack }
    })
    errorsCount++
  }

  return { recordsSynced, errorsCount }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

async function syncAccounts(supabase: any, userId: string, integrationId: string, accessToken: string, realmId: string) {
  let synced = 0
  let errors = 0

  try {
    // Fetch accounts from QuickBooks
    const accounts = await fetchQuickBooksAccounts(accessToken, realmId)

    for (const qbAccount of accounts) {
      try {
        // Map QB account to our schema
        const account = {
          user_id: userId,
          account_name: qbAccount.Name,
          account_type: mapAccountType(qbAccount.AccountType),
          balance: parseFloat(qbAccount.CurrentBalance || 0),
          external_id: qbAccount.Id,
          external_type: qbAccount.AccountType,
          description: qbAccount.Description || null,
          is_active: qbAccount.Active,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        }

        // Upsert account (insert or update based on external_id)
        const { error } = await supabase
          .from('accounts')
          .upsert(account, {
            onConflict: 'user_id,external_id',
            ignoreDuplicates: false
          })

        if (error) {
          console.error('Error syncing account:', error)
          errors++
        } else {
          synced++
        }
      } catch (error) {
        console.error('Error processing account:', error)
        errors++
      }
    }
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw error
  }

  return { synced, errors }
}

async function syncTransactions(supabase: any, userId: string, integrationId: string, accessToken: string, realmId: string) {
  let synced = 0
  let errors = 0

  try {
    // Get date range (last 12 months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    // Fetch transactions from QuickBooks
    const transactions = await fetchQuickBooksTransactions(accessToken, realmId, startDate, endDate)

    for (const qbTxn of transactions) {
      try {
        // Map QB transaction to our schema
        const transaction = {
          user_id: userId,
          amount: parseFloat(qbTxn.Amount || 0),
          category: qbTxn.Category || 'Uncategorized',
          description: qbTxn.Description || qbTxn.PrivateNote || null,
          transaction_date: qbTxn.TxnDate,
          transaction_type: determineTransactionType(qbTxn),
          external_id: qbTxn.Id,
          external_type: qbTxn.type || qbTxn.DetailType,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        }

        // Upsert transaction
        const { error } = await supabase
          .from('transactions')
          .upsert(transaction, {
            onConflict: 'user_id,external_id',
            ignoreDuplicates: false
          })

        if (error) {
          console.error('Error syncing transaction:', error)
          errors++
        } else {
          synced++
        }
      } catch (error) {
        console.error('Error processing transaction:', error)
        errors++
      }
    }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }

  return { synced, errors }
}

async function cacheFinancialReports(supabase: any, userId: string, integrationId: string, accessToken: string, realmId: string) {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)

  // Fetch and cache reports
  const reports = ['ProfitAndLoss', 'BalanceSheet', 'CashFlow']

  for (const reportType of reports) {
    try {
      const reportData = await fetchQuickBooksReport(accessToken, realmId, reportType, startOfYear, today)

      await supabase
        .from('quickbooks_reports')
        .upsert({
          user_id: userId,
          integration_id: integrationId,
          report_type: reportType,
          report_period_start: startOfYear.toISOString().split('T')[0],
          report_period_end: today.toISOString().split('T')[0],
          report_data: reportData,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }, {
          onConflict: 'user_id,integration_id,report_type,report_period_start,report_period_end'
        })
    } catch (error) {
      console.error(`Error caching ${reportType} report:`, error)
    }
  }
}

async function storeCompanyMetadata(supabase: any, userId: string, integrationId: string, accessToken: string, realmId: string) {
  try {
    const companyInfo = await fetchQuickBooksCompanyInfo(accessToken, realmId)
    const preferences = await fetchQuickBooksPreferences(accessToken, realmId)

    await supabase
      .from('quickbooks_metadata')
      .upsert({
        user_id: userId,
        integration_id: integrationId,
        company_info: companyInfo,
        preferences: preferences,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id,integration_id'
      })
  } catch (error) {
    console.error('Error storing metadata:', error)
  }
}

// ============================================
// QUICKBOOKS API CALLS
// ============================================

async function fetchQuickBooksAccounts(accessToken: string, realmId: string) {
  const response = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Account`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`)
  }

  const data = await response.json()
  return data.QueryResponse.Account || []
}

async function fetchQuickBooksTransactions(accessToken: string, realmId: string, startDate: Date, endDate: Date) {
  // QuickBooks doesn't have a single "Transaction" endpoint
  // We need to fetch multiple transaction types and combine them

  const transactions: any[] = []
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Fetch different transaction types
  const types = ['Invoice', 'Bill', 'Payment', 'Purchase', 'SalesReceipt', 'JournalEntry']

  for (const type of types) {
    try {
      const query = `SELECT * FROM ${type} WHERE TxnDate >= '${startDateStr}' AND TxnDate <= '${endDateStr}' MAXRESULTS 1000`
      const response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const items = data.QueryResponse[type] || []
        transactions.push(...items.map((item: any) => ({ ...item, type })))
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error)
    }
  }

  return transactions
}

async function fetchQuickBooksReport(accessToken: string, realmId: string, reportType: string, startDate: Date, endDate: Date) {
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const response = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/${reportType}?start_date=${startDateStr}&end_date=${endDateStr}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch ${reportType} report`)
  }

  return await response.json()
}

async function fetchQuickBooksCompanyInfo(accessToken: string, realmId: string) {
  const response = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch company info')
  }

  const data = await response.json()
  return data.CompanyInfo
}

async function fetchQuickBooksPreferences(accessToken: string, realmId: string) {
  const response = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${realmId}/preferences`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch preferences')
  }

  const data = await response.json()
  return data.Preferences
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapAccountType(qbAccountType: string): string {
  const mapping: Record<string, string> = {
    'Bank': 'cash',
    'Other Current Asset': 'asset',
    'Fixed Asset': 'asset',
    'Other Asset': 'asset',
    'Accounts Receivable': 'asset',
    'Equity': 'asset',
    'Expense': 'expense',
    'Other Expense': 'expense',
    'Cost of Goods Sold': 'expense',
    'Credit Card': 'liability',
    'Long Term Liability': 'liability',
    'Other Current Liability': 'liability',
    'Accounts Payable': 'liability',
    'Income': 'revenue',
    'Other Income': 'revenue'
  }

  return mapping[qbAccountType] || 'asset'
}

function determineTransactionType(qbTxn: any): string {
  const type = qbTxn.type || qbTxn.DetailType || ''

  if (type.includes('Invoice') || type.includes('SalesReceipt') || type.includes('Income')) {
    return 'income'
  }

  if (type.includes('Bill') || type.includes('Purchase') || type.includes('Expense')) {
    return 'expense'
  }

  if (type.includes('Payment') || type.includes('Transfer')) {
    return 'transfer'
  }

  // Default based on amount sign
  return parseFloat(qbTxn.Amount || 0) >= 0 ? 'income' : 'expense'
}
