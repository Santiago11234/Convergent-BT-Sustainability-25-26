import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationWithDetails } from '@/types/database.types';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, loading, error } = useConversations();

  const getOtherUser = (conversation: ConversationWithDetails) => {
    if (!user) return null;
    return conversation.participant_1.id === user.id
      ? conversation.participant_2
      : conversation.participant_1;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleProfilePress = (targetUserId: string, event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    if (user?.id === targetUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${targetUserId}`);
    }
  };

  const renderConversationCard = ({ item }: { item: ConversationWithDetails }) => {
    const otherUser = getOtherUser(item);
    if (!otherUser) return null;

    const hasUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        className="bg-white px-4 py-4 border-b border-gray-100"
        activeOpacity={0.7}
        onPress={() => router.push(`/messages/${item.id}`)}
      >
        <View className="flex-row items-center">
          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(event) => handleProfilePress(otherUser.id, event)}
            className="mr-3"
          >
            {otherUser.profile_pic_url ? (
              <Image
                source={{ uri: otherUser.profile_pic_url }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Message Preview */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-row items-center flex-1"
                onPress={(event) => handleProfilePress(otherUser.id, event)}
              >
                <Text className={`text-base ${hasUnread ? 'font-bold' : 'font-semibold'} text-gray-900`}>
                  {otherUser.name}
                </Text>
                {otherUser.is_verified_seller && (
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
              <Text className="text-xs text-gray-500">
                {formatTime(item.last_message_at)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text
                className={`flex-1 text-sm ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                numberOfLines={1}
              >
                {item.last_message?.text || 'No messages yet'}
              </Text>
              {hasUnread && (
                <View className="bg-primary w-5 h-5 rounded-full items-center justify-center ml-2">
                  <Text className="text-white text-xs font-bold">
                    {item.unread_count! > 9 ? '9+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="text-gray-600 mt-4">Loading conversations...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Error Loading Messages</Text>
        <Text className="text-sm text-gray-600 mt-2 text-center">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900">Messages</Text>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-6">
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-semibold text-gray-400 mt-4">No Messages Yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              Start browsing products and message sellers to begin conversations
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
