import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Image, TextInput, GestureResponderEvent, Animated } from 'react-native';
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
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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

  // Separate component for community card to use hooks properly
  const CommunityCard = ({ 
    item, 
    index, 
    fadeAnim, 
    isMember, 
    joiningIds, 
    handleJoin, 
    handleLeave, 
    router 
  }: { 
    item: Community; 
    index: number; 
    fadeAnim: Animated.Value;
    isMember: (id: string) => boolean;
    joiningIds: Set<string>;
    handleJoin: (id: string) => void;
    handleLeave: (id: string) => void;
    router: any;
  }) => {
    const isJoined = isMember(item.id);
    const isJoining = joiningIds.has(item.id);
    const scaleAnim = React.useRef(new Animated.Value(1)).current; // Start at 1 (no scale)
    const hasAnimated = React.useRef(false);

    React.useEffect(() => {
      if (!hasAnimated.current) {
        scaleAnim.setValue(0.95);
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
          delay: index * 30,
        }).start();
        hasAnimated.current = true;
      }
    }, []);

    const handleCardPress = () => {
      if (isJoined) {
        router.push(`/community/${item.id}`);
      } else {
        Alert.alert('Join Required', 'You need to join this community first to view it.');
      }
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
        <TouchableOpacity
          onPress={handleCardPress}
          className="bg-white rounded-3xl overflow-hidden mb-4 mx-4 shadow-sm"
          activeOpacity={0.9}
        >
          {/* Community Image/Header */}
          <View className="h-32 bg-gray-100 relative">
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Text className="text-5xl">
                  {item.category === 'Farming' && '🌱'}
                  {item.category === 'Marketplace' && '🚜'}
                  {item.category === 'Organic' && '🥕'}
                  {item.category === 'Sustainability' && '♻️'}
                  {item.category === 'Gardening' && '🌳'}
                  {!item.category && '👥'}
                </Text>
              </View>
            )}
            {item.category && (
              <View className="absolute top-4 right-4">
                <View className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-bold text-primary">{item.category}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Community Details */}
          <View className="p-5">
            <Text className="text-xl font-black text-gray-900 mb-2" numberOfLines={1}>
              {item.name}
            </Text>

            {item.description && (
              <Text className="text-sm text-gray-600 mb-4 leading-5" numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="people" size={18} color="#6B7280" />
                <Text className="text-sm font-semibold text-gray-700 ml-2">
                  {item.member_count} {item.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>

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
                className={`px-5 py-2.5 rounded-2xl flex-row items-center ${
                  isJoined
                    ? 'bg-gray-100'
                    : 'bg-primary'
                }`}
                activeOpacity={0.8}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color={isJoined ? '#6B7280' : 'white'} />
                ) : (
                  <>
                    <Ionicons
                      name={isJoined ? 'checkmark-circle' : 'add-circle'}
                      size={18}
                      color={isJoined ? '#6B7280' : 'white'}
                    />
                    <Text
                      className={`text-sm font-bold ml-2 ${
                        isJoined ? 'text-gray-700' : 'text-white'
                      }`}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCommunityCard = ({ item, index }: { item: Community; index: number }) => (
    <CommunityCard
      item={item}
      index={index}
      fadeAnim={fadeAnim}
      isMember={isMember}
      joiningIds={joiningIds}
      handleJoin={handleJoin}
      handleLeave={handleLeave}
      router={router}
    />
  );

  const discoverCommunities = communities.filter((c) => !isMember(c.id));

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={require('@/assets/logos/logo.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-gray-900 ml-2">Community</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/createCommunity')}
            className="bg-primary px-4 py-2 rounded-xl flex-row items-center shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pill-style Tab Selector */}
      <View className="px-6 pt-6 pb-4">
        <View className="bg-primary/10 rounded-full p-1 flex-row">
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
              className={`font-black text-base ${
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
              className={`font-black text-base ${
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
          {loading && communities.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#22C55E" />
              <Text className="text-gray-600 mt-4">Loading communities...</Text>
            </View>
          ) : (
            <ScrollView
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22C55E" />
              }
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {/* My Communities Section */}
              {myCommunities.length > 0 && (
                <View className="px-4 pt-2">
                  <Text className="text-lg font-black text-gray-900 mb-4 px-2">My Communities</Text>
                  {myCommunities.map((community, index) => (
                    <View key={community.id}>
                      {renderCommunityCard({ item: community, index })}
                    </View>
                  ))}
                </View>
              )}

              {/* Discover Communities Section */}
              <View className="px-4 pt-4">
                <Text className="text-lg font-black text-gray-900 mb-4 px-2">
                  {myCommunities.length > 0 ? 'Discover Communities' : 'Join Communities'}
                </Text>

                {discoverCommunities.length === 0 ? (
                  <View className="items-center justify-center py-20">
                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                    <Text className="text-lg font-bold text-gray-400 mt-4">
                      {myCommunities.length > 0
                        ? 'No more communities to discover'
                        : 'No communities yet'}
                    </Text>
                    <Text className="text-sm text-gray-400 mt-2">Create one to get started!</Text>
                  </View>
                ) : (
                  discoverCommunities.map((community, index) => (
                    <View key={community.id}>
                      {renderCommunityCard({ item: community, index: myCommunities.length + index })}
                    </View>
                  ))
                )}
              </View>

              <View className="h-8" />
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View className="px-6 pb-4">
            <View className="bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Find people"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Direct Messages */}
          <View className="px-6">
            <Text className="text-lg font-black text-gray-900 mb-4">Messages</Text>

            {loadingMessages ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#22C55E" />
                <Text className="text-gray-600 mt-4">Loading messages...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View className="py-10 items-center">
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-bold text-gray-400 mt-4">No messages yet</Text>
                <Text className="text-sm text-gray-400 mt-2">Start a conversation with someone!</Text>
              </View>
            ) : (
              conversations.map((conversation) => {
                const otherParticipant = conversation.participant_1_id === user?.id
                  ? conversation.participant_2
                  : conversation.participant_1;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    className="bg-white rounded-3xl p-4 mb-3 flex-row items-center shadow-sm"
                    activeOpacity={0.8}
                    onPress={() => router.push(`/messages/${conversation.id}`)}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mr-4 overflow-hidden border-2 border-white shadow-sm"
                      onPress={(event) => handleProfilePress(otherParticipant.id, event)}
                    >
                      {otherParticipant.profile_pic_url ? (
                        <Image
                          source={{ uri: otherParticipant.profile_pic_url }}
                          className="w-full h-full rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl font-black text-primary">
                          {otherParticipant.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          className="flex-row items-center flex-1"
                          onPress={(event) => handleProfilePress(otherParticipant.id, event)}
                        >
                          <Text className="text-base font-black text-gray-900">
                            {otherParticipant.name}
                          </Text>
                          {otherParticipant.is_verified_seller && (
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                        {conversation.last_message_at && (
                          <Text className="text-xs text-gray-500">
                            {new Date(conversation.last_message_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm text-gray-600" numberOfLines={1}>
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
