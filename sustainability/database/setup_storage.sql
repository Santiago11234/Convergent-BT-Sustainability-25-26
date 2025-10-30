-- Setup Supabase Storage Bucket and RLS Policies for Post Images
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Step 1: Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts', 
  'posts', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 2: Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to posts bucket" ON storage.objects;

-- Step 4: Policy: Allow authenticated users to upload images to posts bucket
CREATE POLICY "Authenticated users can upload to posts bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
);

-- Step 5: Policy: Allow authenticated users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 6: Policy: Allow authenticated users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 7: Policy: Allow public read access (since bucket is public)
CREATE POLICY "Public read access for post images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

