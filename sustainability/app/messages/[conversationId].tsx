import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageInput } from '@/components/messages/MessageInput';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { messages, loading, error, sending, sendMessage, markAsRead } = useMessages(conversationId);
  const flatListRef = useRef<FlatList>(null);
  const [otherUser, setOtherUser] = React.useState<User | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);

  useEffect(() => {
    fetchOtherUser();
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchOtherUser = async () => {
    if (!user || !conversationId) return;

    try {
      setLoadingUser(true);

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          participant_1_id,
          participant_2_id,
          participant_1:users!participant_1_id(*),
          participant_2:users!participant_2_id(*)
        `)
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      const other = conversation.participant_1_id === user.id
        ? conversation.participant_2
        : conversation.participant_1;

      setOtherUser(other as User);
    } catch (err) {
      console.error('Error fetching other user:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  if (loading || loadingUser) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="text-gray-600 mt-4">Loading chat...</Text>
      </SafeAreaView>
    );
  }

  if (error || !otherUser) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Error Loading Chat</Text>
        <Text className="text-sm text-gray-600 mt-2 text-center">{error || 'User not found'}</Text>
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center flex-1"
            activeOpacity={0.8}
            onPress={() => {
              if (user?.id === otherUser.id) {
                router.push('/(tabs)/profile');
              } else {
                router.push(`/profile/${otherUser.id}`);
              }
            }}
          >
            {otherUser.profile_pic_url ? (
              <Image
                source={{ uri: otherUser.profile_pic_url }}
                className="w-10 h-10 rounded-full mr-3"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                <Text className="text-white text-lg font-bold">
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-lg font-bold text-gray-900">{otherUser.name}</Text>
                {otherUser.is_verified_seller && (
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
                )}
              </View>
            {otherUser.seller_rating && otherUser.seller_rating > 0 ? (
              <View className="flex-row items-center">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text className="text-xs text-gray-500 ml-1">
                  {otherUser.seller_rating.toFixed(1)} ({otherUser.review_count} reviews)
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-gray-500">Unrated</Text>
            )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="p-2 -mr-2">
            <Ionicons name="ellipsis-vertical" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwnMessage={item.sender_id === user?.id}
            />
          )}
          keyExtractor={(item) => item.id}
          className="flex-1 bg-gray-50 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text className="text-lg font-semibold text-gray-400 mt-4">No messages yet</Text>
              <Text className="text-sm text-gray-400 mt-1">Start the conversation!</Text>
            </View>
          }
        />

        {/* Message Input */}
        <MessageInput onSend={sendMessage} sending={sending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
