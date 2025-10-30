-- Setup Supabase Storage Bucket and RLS Policies for Post Images
-- Run this in your Supabase SQL Editor
-- This version doesn't drop existing policies, so it's safer and doesn't require admin permissions

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

-- Step 2: Create policies (they will fail if they already exist, which is fine)
-- Policy: Allow authenticated users to upload images to posts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload to posts bucket'
  ) THEN
    CREATE POLICY "Authenticated users can upload to posts bucket"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'posts');
  END IF;
END $$;

-- Policy: Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for post images'
  ) THEN
    CREATE POLICY "Public read access for post images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'posts');
  END IF;
END $$;

-- Policy: Allow users to update their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to update their own images'
  ) THEN
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
  END IF;
END $$;

-- Policy: Allow users to delete their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to delete their own images'
  ) THEN
    CREATE POLICY "Allow users to delete their own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'posts' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

