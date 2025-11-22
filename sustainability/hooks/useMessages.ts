import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    // Subscribe to realtime updates for new messages
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const uploadMessageImage = async (localUri: string): Promise<string> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Get file extension
      const fileExtension = localUri.split('.').pop() || 'jpg';
      const fileName = `${authUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExtension}`;
      const filePath = `message-images/${fileName}`;

      // Load file as ArrayBuffer for React Native
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localUri);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Failed to load file: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Failed to load file'));
        xhr.send();
      });

      // Convert ArrayBuffer to Uint8Array for Supabase
      const fileArray = new Uint8Array(fileData);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('posts') // Using same bucket as posts
        .upload(filePath, fileArray, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading message image:', error);
      throw error;
    }
  };

  const sendMessage = async (text: string, images?: string[]): Promise<boolean> => {
    if (!user || !conversationId || (!text.trim() && (!images || images.length === 0))) return false;

    try {
      setSending(true);

      // Upload images if any
      let imageUrls: string[] = [];
      if (images && images.length > 0) {
        imageUrls = await Promise.all(
          images.map(uri => uploadMessageImage(uri))
        );
      }

      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: text.trim() || '',
        images: imageUrls.length > 0 ? imageUrls : [],
        is_read: false,
      });

      if (insertError) throw insertError;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async () => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
  };
}
