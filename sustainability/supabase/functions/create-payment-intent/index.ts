// Supabase Edge Function: Create Payment Intent
// Purpose: Creates a Stripe Payment Intent for marketplace transactions
// Deployed at: https://[project-ref].supabase.co/functions/v1/create-payment-intent

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentIntentRequest {
  productId: string
  quantity: number
  buyerId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get request body
    const { productId, quantity, buyerId }: PaymentIntentRequest = await req.json()

    // Validate inputs
    if (!productId || !quantity || !buyerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: productId, quantity, buyerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch product details
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*, seller:users!products_seller_id_fkey(id, name, email, stripe_account_id)')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check inventory
    if (product.quantity_available < quantity) {
      return new Response(
        JSON.stringify({ error: 'Insufficient quantity available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate amounts
    const unitPrice = parseFloat(product.price)
    const totalAmount = unitPrice * quantity
    const platformFeePercent = 0.10 // 10% platform fee
    const platformFeeAmount = Math.round(totalAmount * platformFeePercent * 100) // Convert to cents
    const stripeAmount = Math.round(totalAmount * 100) // Convert to cents

    // Get or create Stripe customer for buyer
    const { data: buyer } = await supabaseClient
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', buyerId)
      .single()

    let customerId = buyer?.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: buyer?.email,
        name: buyer?.name,
        metadata: {
          supabase_user_id: buyerId,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabaseClient
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', buyerId)
    }

    // Check if seller has connected account
    const sellerStripeAccountId = product.seller?.stripe_account_id
    if (!sellerStripeAccountId) {
      return new Response(
        JSON.stringify({
          error: 'Seller has not completed payment setup',
          code: 'SELLER_NOT_ONBOARDED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create payment intent with destination charge (Stripe Connect)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: 'usd',
      customer: customerId,
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: sellerStripeAccountId,
      },
      metadata: {
        product_id: productId,
        seller_id: product.seller_id,
        buyer_id: buyerId,
        quantity: quantity.toString(),
        unit_price: unitPrice.toString(),
      },
      description: `Purchase of ${quantity}x ${product.title}`,
    })

    // Create pending transaction record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        buyer_id: buyerId,
        seller_id: product.seller_id,
        product_id: productId,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        platform_fee_amount: platformFeeAmount / 100, // Convert back to dollars
        seller_payout_amount: (stripeAmount - platformFeeAmount) / 100,
        status: 'pending',
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError)
      // Cancel the payment intent if transaction creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id)
      throw transactionError
    }

    // Return payment intent client secret
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId: transaction.id,
        amount: totalAmount,
        platformFee: platformFeeAmount / 100,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
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
