-- Add missing columns to products table for create-post functionality
-- Run this in your Supabase SQL Editor

-- Add payment methods (array of strings)
ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_methods TEXT[];

-- Add other payment method (for custom payment types)
ALTER TABLE products ADD COLUMN IF NOT EXISTS other_payment_method VARCHAR(255);

-- Add pickup instructions
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;

-- Add pickup coordinates
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10,8);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11,8);

-- Add address type (residential vs commercial)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_residential BOOLEAN DEFAULT TRUE;

-- Add general location coordinates (for the main location)
ALTER TABLE products ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE products ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Add indexes for better performance on location-based queries
CREATE INDEX IF NOT EXISTS idx_products_pickup_location ON products(pickup_latitude, pickup_longitude);
CREATE INDEX IF NOT EXISTS idx_products_general_location ON products(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_products_payment_methods ON products USING GIN(payment_methods);

-- Add comments for documentation
COMMENT ON COLUMN products.payment_methods IS 'Array of accepted payment methods (cash, venmo, paypal, etc.)';
COMMENT ON COLUMN products.other_payment_method IS 'Custom payment method when "Other" is selected';
COMMENT ON COLUMN products.pickup_instructions IS 'Instructions for buyers on how to pick up the product';
COMMENT ON COLUMN products.pickup_latitude IS 'Latitude coordinate for exact pickup location';
COMMENT ON COLUMN products.pickup_longitude IS 'Longitude coordinate for exact pickup location';
COMMENT ON COLUMN products.is_residential IS 'Whether the pickup location is residential or commercial';
COMMENT ON COLUMN products.latitude IS 'General latitude coordinate for the main location';
COMMENT ON COLUMN products.longitude IS 'General longitude coordinate for the main location';
