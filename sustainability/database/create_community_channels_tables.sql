-- Create community_channels table
CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT DEFAULT 'text', -- 'text', 'announcement', etc.
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_messages table
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_community_channels_community_id ON public.community_channels(community_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON public.channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON public.channel_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_channels
-- Community members can view channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_channels' 
    AND policyname = 'Community members can view channels'
  ) THEN
    CREATE POLICY "Community members can view channels" ON public.community_channels
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.community_members
          WHERE community_members.community_id = community_channels.community_id
          AND community_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Community admins/moderators can create channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_channels' 
    AND policyname = 'Community admins can create channels'
  ) THEN
    CREATE POLICY "Community admins can create channels" ON public.community_channels
      FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        (
          EXISTS (
            SELECT 1 FROM public.communities
            WHERE communities.id = community_channels.community_id
            AND communities.created_by = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.community_members
            WHERE community_members.community_id = community_channels.community_id
            AND community_members.user_id = auth.uid()
            AND community_members.role IN ('admin', 'moderator')
          )
        )
      );
  END IF;
END $$;

-- RLS Policies for channel_messages
-- Community members can view messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'channel_messages' 
    AND policyname = 'Community members can view messages'
  ) THEN
    CREATE POLICY "Community members can view messages" ON public.channel_messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.community_channels
          JOIN public.community_members ON community_members.community_id = community_channels.community_id
          WHERE community_channels.id = channel_messages.channel_id
          AND community_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Community members can send messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'channel_messages' 
    AND policyname = 'Community members can send messages'
  ) THEN
    CREATE POLICY "Community members can send messages" ON public.channel_messages
      FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
          SELECT 1 FROM public.community_channels
          JOIN public.community_members ON community_members.community_id = community_channels.community_id
          WHERE community_channels.id = channel_messages.channel_id
          AND community_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Users can edit/delete their own messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'channel_messages' 
    AND policyname = 'Users can edit their own messages'
  ) THEN
    CREATE POLICY "Users can edit their own messages" ON public.channel_messages
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'channel_messages' 
    AND policyname = 'Users can delete their own messages'
  ) THEN
    CREATE POLICY "Users can delete their own messages" ON public.channel_messages
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

