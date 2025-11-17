-- Migration: Add Stripe Integration Fields
-- Description: Adds necessary fields for Stripe payment processing and Stripe Connect
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- Add Stripe fields to USERS table
-- ============================================================================

-- Add Stripe customer ID for buyers
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe Connect account ID for sellers
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE;

-- Add onboarding status for Stripe Connect
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Add index for faster Stripe ID lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_account_id ON public.users(stripe_account_id);

COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe Customer ID for buyers making purchases';
COMMENT ON COLUMN public.users.stripe_account_id IS 'Stripe Connect Account ID for sellers receiving payments';
COMMENT ON COLUMN public.users.stripe_onboarding_complete IS 'Whether seller has completed Stripe Connect onboarding';

-- ============================================================================
-- Add Stripe fields to TRANSACTIONS table
-- ============================================================================

-- Add Stripe payment intent ID
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

-- Add Stripe checkout session ID (if using Checkout instead of Payment Intents)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add Stripe transfer ID (for tracking payouts to sellers)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Add platform fee amount (your commission)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Add seller payout amount (total - platform fee - Stripe fees)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS seller_payout_amount DECIMAL(10, 2);

-- Add index for faster Stripe payment lookups
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent ON public.transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session ON public.transactions(stripe_checkout_session_id);

COMMENT ON COLUMN public.transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID for this transaction';
COMMENT ON COLUMN public.transactions.stripe_checkout_session_id IS 'Stripe Checkout Session ID (if using Stripe Checkout)';
COMMENT ON COLUMN public.transactions.stripe_transfer_id IS 'Stripe Transfer ID for seller payout';
COMMENT ON COLUMN public.transactions.platform_fee_amount IS 'Platform commission/fee taken from this transaction';
COMMENT ON COLUMN public.transactions.seller_payout_amount IS 'Amount paid out to seller after fees';

-- ============================================================================
-- Update transaction status enum to include Stripe-specific statuses
-- ============================================================================

COMMENT ON COLUMN public.transactions.status IS 'Transaction status: pending, processing, completed, cancelled, refunded, failed';

-- ============================================================================
-- Migration completed successfully!
-- ============================================================================
