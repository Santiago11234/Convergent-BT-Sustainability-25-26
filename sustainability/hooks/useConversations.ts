import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:users!participant_1_id(*),
          participant_2:users!participant_2_id(*)
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .eq('is_read', false);

          return {
            ...conv,
            last_message: lastMessage || undefined,
            unread_count: unreadCount || 0,
          } as ConversationWithDetails;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to realtime updates for conversations
    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(participant_1_id.eq.${user.id},participant_2_id.eq.${user.id})`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const getOrCreateConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        return existing.id;
      }

      // Ensure canonical ordering (participant_1_id < participant_2_id)
      const [participant1, participant2] = user.id < otherUserId
        ? [user.id, otherUserId]
        : [otherUserId, user.id];

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: participant1,
          participant_2_id: participant2,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) throw createError;

      return newConv.id;
    } catch (err) {
      console.error('Error creating conversation:', err);
      return null;
    }
  };

  return {
    conversations,
    loading,
    error,
    getOrCreateConversation,
    refetch: fetchConversations,
  };
}

