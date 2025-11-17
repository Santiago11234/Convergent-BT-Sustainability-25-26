// Supabase Edge Function: Check Onboarding Status
// Purpose: Checks Stripe Connect account status and updates the database
// Deployed at: https://[project-ref].supabase.co/functions/v1/check-onboarding-status

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== CHECK ONBOARDING STATUS STARTED ===')
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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    // Verify the userId matches the authenticated user
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot check status for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the authenticated user's ID
    const actualUserId = userId || user.id

    // Get user's Stripe account ID
    const { data: userRecord, error: userError } = await supabaseClient
      .from('users')
      .select('stripe_account_id')
      .eq('id', actualUserId)
      .single()

    if (userError || !userRecord) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userRecord.stripe_account_id) {
      return new Response(
        JSON.stringify({
          onboardingComplete: false,
          message: 'No Stripe account found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve account from Stripe
    console.log('Retrieving Stripe account:', userRecord.stripe_account_id)
    const account = await stripe.accounts.retrieve(userRecord.stripe_account_id)
    console.log('Stripe account retrieved successfully')

    // Check if onboarding is complete
    const isOnboarded = account.charges_enabled && account.payouts_enabled

    console.log('Account status:', {
      accountId: userRecord.stripe_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      isOnboarded,
    })

    // Update database with current status
    console.log('Updating database with onboarding status')
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        stripe_onboarding_complete: isOnboarded,
        is_verified_seller: isOnboarded,
      })
      .eq('id', actualUserId)

    if (updateError) {
      console.error('Database update error:', updateError)
    } else {
      console.log('Database updated successfully')
    }

    console.log('=== CHECK ONBOARDING STATUS COMPLETED ===')

    return new Response(
      JSON.stringify({
        onboardingComplete: isOnboarded,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('=== CHECK ONBOARDING STATUS ERROR ===')
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
