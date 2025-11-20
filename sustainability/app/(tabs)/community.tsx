import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Image, TextInput, GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCommunity, Community } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/database.types';

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    communities,
    myCommunities,
    loading,
    joinCommunity,
    leaveCommunity,
    refreshCommunities,
    isMember,
  } = useCommunity();
  const [refreshing, setRefreshing] = useState(false);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'communities' | 'messages'>('communities');
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCommunities();
    setRefreshing(false);
  };

  const fetchConversations = async () => {
    if (!user) return;

    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:users!participant_1_id(*),
          participant_2:users!participant_2_id(*),
          last_message:messages(*)
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get the last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMsg,
          } as ConversationWithDetails;
        })
      );

      setConversations(conversationsWithLastMessage);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages' && user) {
      fetchConversations();
    }
  }, [activeTab, user]);

  const handleJoin = async (communityId: string) => {
    setJoiningIds((prev) => new Set([...prev, communityId]));
    try {
      await joinCommunity(communityId);
      Alert.alert('Success', 'You have joined the community!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join community');
    } finally {
      setJoiningIds((prev) => {
        const next = new Set(prev);
        next.delete(communityId);
        return next;
      });
    }
  };

  const handleLeave = async (communityId: string) => {
    Alert.alert(
      'Leave Community',
      'Are you sure you want to leave this community?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunity(communityId);
              Alert.alert('Success', 'You have left the community');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave community');
            }
          },
        },
      ]
    );
  };

  const handleProfilePress = (targetUserId?: string | null, event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    if (!targetUserId) return;
    if (user?.id === targetUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${targetUserId}`);
    }
  };

  const renderCommunityCard = ({ item }: { item: Community }) => {
    const isJoined = isMember(item.id);
    const isJoining = joiningIds.has(item.id);

    const handleCardPress = () => {
      if (isJoined) {
        router.push(`/community/${item.id}`);
      } else {
        Alert.alert('Join Required', 'You need to join this community first to view it.');
      }
    };

    return (
      <TouchableOpacity
        onPress={handleCardPress}
        className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
        activeOpacity={0.7}
      >
        <View className="flex-row">
          {/* Community Image/Icon */}
          <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-4">
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                className="w-16 h-16 rounded-xl"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-3xl">
                {item.category === 'Farming' && '🌱'}
                {item.category === 'Marketplace' && '🚜'}
                {item.category === 'Organic' && '🥕'}
                {item.category === 'Sustainability' && '♻️'}
                {item.category === 'Gardening' && '🌳'}
                {!item.category && '👥'}
              </Text>
            )}
          </View>

          {/* Community Details */}
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
                {item.name}
              </Text>
              {item.category && (
                <View className="bg-primary/10 px-2 py-1 rounded-full ml-2">
                  <Text className="text-xs font-semibold text-primary">{item.category}</Text>
                </View>
              )}
            </View>

            {item.description && (
              <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <Ionicons name="people-outline" size={16} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  {item.member_count} {item.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>

              {/* Join/Leave Button */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (isJoined) {
                    handleLeave(item.id);
                  } else {
                    handleJoin(item.id);
                  }
                }}
                disabled={isJoining}
                className={`px-4 py-2 rounded-lg flex-row items-center ${
                  isJoined
                    ? 'bg-gray-100'
                    : 'bg-primary'
                }`}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color={isJoined ? '#6B7280' : 'white'} />
                ) : (
                  <>
                    <Ionicons
                      name={isJoined ? 'checkmark-circle' : 'add-circle'}
                      size={16}
                      color={isJoined ? '#6B7280' : 'white'}
                    />
                    <Text
                      className={`text-sm font-semibold ml-1 ${
                        isJoined ? 'text-gray-600' : 'text-white'
                      }`}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter communities: show those not joined in "Discover Communities"
  const discoverCommunities = communities.filter((c) => !isMember(c.id));

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Pill-style Tab Selector */}
      <View className="px-6 pt-6 pb-4">
        <View className="bg-primary/20 rounded-full p-1" style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setActiveTab('communities')}
            style={{ flex: 1 }}
            className="py-3.5 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <View
              className={`absolute inset-0 rounded-full ${
                activeTab === 'communities' ? 'bg-primary' : ''
              }`}
            />
            <Text
              className={`font-extrabold text-lg ${
                activeTab === 'communities' ? 'text-white' : 'text-primary'
              }`}
              numberOfLines={1}
            >
              Communities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('messages')}
            style={{ flex: 1 }}
            className="py-3.5 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <View
              className={`absolute inset-0 rounded-full ${
                activeTab === 'messages' ? 'bg-primary' : ''
              }`}
            />
            <Text
              className={`font-extrabold text-lg ${
                activeTab === 'messages' ? 'text-white' : 'text-primary'
              }`}
              numberOfLines={1}
            >
              Messages
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'communities' ? (
        <>
          {/* Create Community Button */}
          <View className="px-6 pb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Connect with others</Text>
            <TouchableOpacity
              onPress={() => router.push('/createCommunity')}
              className="bg-white rounded-full p-2 shadow-sm border border-gray-200"
            >
              <Ionicons name="add" size={24} color="#22C55E" />
            </TouchableOpacity>
          </View>

          {loading && communities.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#22C55E" />
              <Text className="text-gray-600 mt-4">Loading communities...</Text>
            </View>
          ) : (
            <ScrollView
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              className="flex-1"
            >
              {/* My Communities Section */}
              {myCommunities.length > 0 && (
                <View className="px-4 pt-4">
                  <Text className="text-lg font-bold text-gray-900 mb-3">My Communities</Text>
                  {myCommunities.map((community) => (
                    <View key={community.id}>
                      {renderCommunityCard({ item: community })}
                    </View>
                  ))}
                </View>
              )}

              {/* Discover Communities Section */}
              <View className="px-4 pt-4">
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  {myCommunities.length > 0 ? 'Discover Communities' : 'Join Communities'}
                </Text>

                {discoverCommunities.length === 0 ? (
                  <View className="items-center justify-center py-20">
                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                    <Text className="text-lg font-semibold text-gray-400 mt-4">
                      {myCommunities.length > 0
                        ? 'No more communities to discover'
                        : 'No communities yet'}
                    </Text>
                    <Text className="text-sm text-gray-400 mt-2">
                      Create one to get started!
                    </Text>
                  </View>
                ) : (
                  discoverCommunities.map((community) => (
                    <View key={community.id}>
                      {renderCommunityCard({ item: community })}
                    </View>
                  ))
                )}
              </View>

              {/* Bottom padding */}
              <View className="h-8" />
            </ScrollView>
          )}
        </>
      ) : (
        // Messages Tab
        <ScrollView className="flex-1">
          {/* Search Bar */}
          <View className="px-6 pb-4">
            <View className="bg-primary/10 rounded-full px-4 py-3 flex-row items-center">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Find people"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Your Communities Messages */}
          {myCommunities.length > 0 && (
            <View className="px-6 pb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">Your Communities</Text>
              <View className="flex-row gap-3 mb-4">
                {myCommunities.slice(0, 2).map((community) => (
                  <TouchableOpacity
                    key={community.id}
                    className="flex-1 rounded-2xl overflow-hidden bg-gray-800 h-24"
                    activeOpacity={0.8}
                    onPress={() => router.push(`/community/${community.id}`)}
                  >
                    <Image
                      source={{ uri: community.image_url || 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/40 justify-end p-3">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>
                        {community.name}
                      </Text>
                      <Text className="text-white/80 text-xs mt-0.5">
                        Tap to view
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Direct Messages */}
          <View className="px-6">
            <Text className="text-base font-bold text-gray-900 mb-3">Messages</Text>

            {loadingMessages ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#22C55E" />
                <Text className="text-gray-600 mt-4">Loading messages...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View className="py-10 items-center">
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-semibold text-gray-400 mt-4">No messages yet</Text>
                <Text className="text-sm text-gray-400 mt-2">
                  Start a conversation with someone!
                </Text>
              </View>
            ) : (
              conversations.map((conversation) => {
                // Determine the other participant (not the current user)
                const otherParticipant = conversation.participant_1_id === user?.id
                  ? conversation.participant_2
                  : conversation.participant_1;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    className="flex-row items-center py-3 border-b border-gray-100"
                    activeOpacity={0.7}
                    onPress={() => router.push(`/messages/${conversation.id}`)}
                  >
                    {/* Avatar */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3 overflow-hidden"
                      onPress={(event) => handleProfilePress(otherParticipant.id, event)}
                    >
                      {otherParticipant.profile_pic_url ? (
                        <Image
                          source={{ uri: otherParticipant.profile_pic_url }}
                          className="w-12 h-12 rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl font-bold text-primary">
                          {otherParticipant.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Message Info */}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          className="flex-row items-center flex-1"
                          onPress={(event) => handleProfilePress(otherParticipant.id, event)}
                        >
                          <Text className="text-base font-semibold text-gray-900">
                            {otherParticipant.name}
                          </Text>
                          {otherParticipant.is_verified_seller && (
                            <Ionicons name="checkmark-circle" size={14} color="#22C55E" style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                        {conversation.last_message_at && (
                          <Text className="text-xs text-gray-400">
                            {new Date(conversation.last_message_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                        {conversation.last_message?.text || 'No messages yet'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View className="h-20" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
