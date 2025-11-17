// Supabase Edge Function: Create Stripe Connect Account
// Purpose: Creates and manages Stripe Connect accounts for sellers
// Deployed at: https://[project-ref].supabase.co/functions/v1/create-connect-account

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== CREATE CONNECT ACCOUNT STARTED ===')
  console.log('Request method:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request - returning OK')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    if (!authHeader) {
      console.error('ERROR: Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Initializing Stripe client')
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
    console.log('Stripe client initialized')

    // Create Supabase client with the user's auth token
    console.log('Creating Supabase client')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the user is authenticated
    console.log('Verifying user authentication')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('AUTH ERROR:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated successfully. User ID:', user.id)

    const { userId } = await req.json()
    console.log('Received userId from request:', userId)

    // Verify the userId matches the authenticated user
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot create account for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the authenticated user's ID
    const actualUserId = userId || user.id

    // Get user info from database
    const { data: userRecord, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', actualUserId)
      .single()

    if (userError || !userRecord) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create or retrieve Connect account
    let accountId = userRecord.stripe_account_id

    if (!accountId) {
      console.log('Creating new Stripe Connect account for user:', actualUserId)

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userRecord.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '5499', // Miscellaneous food stores - generic retail
          product_description: 'Sustainable products marketplace',
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
        metadata: {
          supabase_user_id: actualUserId,
        },
      })

      accountId = account.id

      // Save account ID to database
      await supabaseClient
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', actualUserId)

      console.log('Created Stripe Connect account:', accountId)
    } else {
      console.log('Using existing Stripe Connect account:', accountId)
    }

    // Create account link for onboarding
    const appUrl = Deno.env.get('APP_URL')
    console.log('Creating account link. APP_URL:', appUrl)
    console.log('Refresh URL will be:', `${appUrl}?onboarding=refresh`)
    console.log('Return URL will be:', `${appUrl}?onboarding=complete`)

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}?onboarding=refresh`,
      return_url: `${appUrl}?onboarding=complete`,
      type: 'account_onboarding',
      collect: 'currently_due', // Only collect information that's immediately required
    })

    console.log('Account link created successfully')
    console.log('Account link URL:', accountLink.url)
    console.log('=== CREATE CONNECT ACCOUNT COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        accountId: accountId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('=== CREATE CONNECT ACCOUNT ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error:', JSON.stringify(error, null, 2))

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
