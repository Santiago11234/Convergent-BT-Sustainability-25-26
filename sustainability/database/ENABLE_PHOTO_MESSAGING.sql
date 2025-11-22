-- ============================================================================
-- Enable Photo Messaging - Run this in Supabase SQL Editor
-- ============================================================================
-- This script adds image support to the messages table
-- Photos will be stored in the existing 'posts' storage bucket

-- Step 1: Add images column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Step 2: Make text column nullable (to allow image-only messages)
ALTER TABLE public.messages 
ALTER COLUMN text DROP NOT NULL;

-- Step 3: Add a check constraint to ensure at least text or images exist
ALTER TABLE public.messages
ADD CONSTRAINT messages_must_have_content 
CHECK (
  (text IS NOT NULL AND text != '') OR 
  (images IS NOT NULL AND array_length(images, 1) > 0)
);

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON public.messages(conversation_id, created_at DESC);

-- Step 5: Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' 
  AND table_schema = 'public'
  AND column_name IN ('text', 'images')
ORDER BY column_name;

-- Done! Photo messaging is now enabled.
-- Images will be uploaded to: storage/posts/message-images/{userId}/{timestamp}_{random}.{ext}

