-- Setup Supabase Storage for Message Images
-- Run this in your Supabase SQL Editor to ensure message images persist properly

-- Option 1: Use existing 'posts' bucket (simpler, already set up)
-- The images are already being uploaded to posts bucket in message-images/ folder
-- This should work with existing policies, but let's verify

-- Verify the posts bucket exists and is public
SELECT * FROM storage.buckets WHERE id = 'posts';

-- Ensure public read access works for message-images folder
-- The existing "Public read access for post images" policy should already cover this
-- since it allows SELECT on all files in the 'posts' bucket

-- Option 2: Create a separate 'messages' bucket (better organization)
-- Uncomment below if you want a dedicated bucket for messages

/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages', 
  'messages', 
  true, 
  10485760, -- 10MB limit for message images
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload message images
CREATE POLICY "Authenticated users can upload message images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages'
);

-- Policy: Allow public read access for message images
CREATE POLICY "Public read access for message images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'messages');

-- Policy: Allow users to delete their own message images
CREATE POLICY "Users can delete their own message images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- Current setup: Messages use 'posts' bucket with path 'message-images/'
-- This works because:
-- 1. Upload policy allows authenticated users to upload to 'posts' bucket (no folder restriction)
-- 2. Public read policy allows anyone to read from 'posts' bucket
-- 3. Images are stored permanently with public URLs in the database

-- To verify your images are persisting, check:
-- SELECT images FROM messages WHERE images IS NOT NULL AND array_length(images, 1) > 0;

