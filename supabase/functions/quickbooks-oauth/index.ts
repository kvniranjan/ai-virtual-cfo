// QuickBooks OAuth Handler
// Handles OAuth 2.0 flow for QuickBooks Online integration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') // 'authorize', 'callback', 'refresh', 'disconnect'

    switch (action) {
      case 'authorize':
        return handleAuthorize(req)
      case 'callback':
        return handleCallback(req)
      case 'refresh':
        return handleRefresh(req)
      case 'disconnect':
        return handleDisconnect(req)
      default:
        throw new Error('Invalid action. Use: authorize, callback, refresh, or disconnect')
    }
  } catch (error) {
    console.error('QuickBooks OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Step 1: Initiate OAuth flow
async function handleAuthorize(req: Request) {
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
  const redirectUri = Deno.env.get('QUICKBOOKS_REDIRECT_URI')

  if (!clientId || !redirectUri) {
    throw new Error('QuickBooks credentials not configured')
  }

  // Generate state parameter for security (CSRF protection)
  const state = crypto.randomUUID()

  // Store state in user metadata temporarily (or use a separate table)
  await supabase.from('user_profiles').upsert({
    id: user.id,
    oauth_state: state
  })

  // Build authorization URL
  const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)

  return new Response(
    JSON.stringify({
      authorizationUrl: authUrl.toString(),
      state: state
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Step 2: Handle OAuth callback
async function handleCallback(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const realmId = url.searchParams.get('realmId') // QuickBooks company ID

  if (!code || !state || !realmId) {
    throw new Error('Missing required OAuth parameters')
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Verify state (CSRF protection)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, oauth_state')
    .eq('oauth_state', state)
    .single()

  if (!profile) {
    throw new Error('Invalid state parameter')
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code)

  // Get company info from QuickBooks
  const companyInfo = await getCompanyInfo(tokens.access_token, realmId)

  // Store integration connection
  const { data: integration, error: intError } = await supabase
    .from('integration_connections')
    .insert({
      user_id: profile.id,
      provider: 'quickbooks',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      realm_id: realmId,
      company_id: realmId,
      company_name: companyInfo.CompanyName,
      is_active: true,
      metadata: {
        company_info: companyInfo,
        scopes: tokens.scope
      }
    })
    .select()
    .single()

  if (intError) {
    throw new Error(`Failed to save integration: ${intError.message}`)
  }

  // Trigger initial sync
  await triggerSync(supabase, profile.id, integration.id, 'full')

  // Clear oauth_state
  await supabase
    .from('user_profiles')
    .update({ oauth_state: null })
    .eq('id', profile.id)

  return new Response(
    JSON.stringify({
      success: true,
      integration: {
        id: integration.id,
        company_name: companyInfo.CompanyName
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Step 3: Refresh expired token
async function handleRefresh(req: Request) {
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

  const { integration_id } = await req.json()

  // Get integration
  const { data: integration } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('id', integration_id)
    .eq('user_id', user.id)
    .single()

  if (!integration) {
    throw new Error('Integration not found')
  }

  // Refresh token
  const tokens = await refreshAccessToken(integration.refresh_token)

  // Update integration
  await supabase
    .from('integration_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', integration_id)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Step 4: Disconnect integration
async function handleDisconnect(req: Request) {
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { integration_id } = await req.json()

  // Call disconnect function
  const { error } = await supabase.rpc('disconnect_integration', {
    p_integration_id: integration_id
  })

  if (error) {
    throw error
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function exchangeCodeForTokens(code: string) {
  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
  const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')
  const redirectUri = Deno.env.get('QUICKBOOKS_REDIRECT_URI')

  const authString = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return await response.json()
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
  const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')

  const authString = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return await response.json()
}

async function getCompanyInfo(accessToken: string, realmId: string) {
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

async function triggerSync(supabase: any, userId: string, integrationId: string, syncType: string) {
  // Create sync job
  await supabase
    .from('sync_jobs')
    .insert({
      user_id: userId,
      integration_id: integrationId,
      sync_type: syncType,
      status: 'pending'
    })

  // In production, this would trigger a background job/queue
  // For now, we'll handle sync in a separate Edge Function
  console.log(`Sync job created for integration ${integrationId}`)
}
