-- Adds AI verification metadata columns to products table

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_confidence numeric;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_ripeness_score numeric;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_notes text[];

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_metadata jsonb;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS verification_completed_at timestamptz;

