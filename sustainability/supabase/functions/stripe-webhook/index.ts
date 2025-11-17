// Supabase Edge Function: Stripe Webhook Handler
// Purpose: Handles Stripe webhook events for payment processing
// Deployed at: https://[project-ref].supabase.co/functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    console.log('Received webhook event:', event.type)

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        console.log('Payment succeeded:', paymentIntent.id)

        // Update transaction status
        const { error: updateError } = await supabaseClient
          .from('transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (updateError) {
          console.error('Error updating transaction:', updateError)
          throw updateError
        }

        // Get transaction to update product inventory
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('product_id, quantity')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (transaction) {
          // Decrement product quantity
          const { data: product } = await supabaseClient
            .from('products')
            .select('quantity_available')
            .eq('id', transaction.product_id)
            .single()

          if (product) {
            const newQuantity = product.quantity_available - transaction.quantity
            await supabaseClient
              .from('products')
              .update({ quantity_available: newQuantity })
              .eq('id', transaction.product_id)
          }
        }
        break
      }

      case 'payment_intent.payment_failed':
      case 'charge.failed': {
        let paymentIntentId: string | null = null
        let failureMessage = 'Payment failed'

        if (event.type === 'payment_intent.payment_failed') {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          paymentIntentId = paymentIntent.id
          failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed'
        } else {
          const charge = event.data.object as Stripe.Charge
          paymentIntentId = charge.payment_intent as string
          failureMessage = charge.failure_message || 'Payment failed'
        }

        if (paymentIntentId) {
          console.log('Payment failed:', paymentIntentId)

          await supabaseClient
            .from('transactions')
            .update({
              status: 'failed',
              transaction_notes: failureMessage
            })
            .eq('stripe_payment_intent_id', paymentIntentId)
        }
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        console.log('Payment intent canceled:', paymentIntent.id)

        await supabaseClient
          .from('transactions')
          .update({ status: 'cancelled' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const userId = account.metadata?.supabase_user_id

        console.log('Account updated for user:', userId)

        if (userId && account.charges_enabled && account.payouts_enabled) {
          await supabaseClient
            .from('users')
            .update({
              stripe_onboarding_complete: true,
              is_verified_seller: true
            })
            .eq('id', userId)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent

        console.log('Charge refunded:', paymentIntentId)

        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntentId as string)

        // Restore inventory
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('product_id, quantity')
          .eq('stripe_payment_intent_id', paymentIntentId as string)
          .single()

        if (transaction) {
          const { data: product } = await supabaseClient
            .from('products')
            .select('quantity_available')
            .eq('id', transaction.product_id)
            .single()

          if (product) {
            const newQuantity = product.quantity_available + transaction.quantity
            await supabaseClient
              .from('products')
              .update({ quantity_available: newQuantity })
              .eq('id', transaction.product_id)
          }
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
