-- Add images column to messages table for photo support
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add index for better performance if needed
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON public.messages(conversation_id, created_at DESC);

