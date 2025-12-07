import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TextInput, Modal, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useCommunity, Community, CommunityMember } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';

interface Channel {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  channel_type: string;
  created_by: string;
  created_at: string;
}

interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
    profile_pic_url: string | null;
  };
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { getCommunityMembers, isMember } = useCommunity();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'channels' | 'members'>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const messagesListRef = React.useRef<FlatList>(null);
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(false);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const channelsSidebarAnim = useRef(new Animated.Value(-264)).current; // -264 = -w-64 (256px) with some padding
  const membersSidebarAnim = useRef(new Animated.Value(264)).current; // 264 = w-64 (256px) with some padding
  const channelsOverlayOpacity = useRef(new Animated.Value(0)).current;
  const membersOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      fetchCommunity();
      fetchChannels();
      fetchMembers();
    }
  }, [id]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChannel]);

  useEffect(() => {
    if (showChannelsSidebar) {
      Animated.parallel([
        Animated.timing(channelsSidebarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(channelsOverlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(channelsSidebarAnim, {
          toValue: -264,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(channelsOverlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showChannelsSidebar]);

  useEffect(() => {
    if (showMembersSidebar) {
      Animated.parallel([
        Animated.timing(membersSidebarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(membersOverlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(membersSidebarAnim, {
          toValue: 264,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(membersOverlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMembersSidebar]);

  const fetchCommunity = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          users!communities_created_by_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCommunity(data);
    } catch (error) {
      console.error('Error fetching community:', error);
      Alert.alert('Error', 'Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('community_channels')
        .select('*')
        .eq('community_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
      
      // Auto-select first channel if available
      if (data && data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const membersList = await getCommunityMembers(id);
      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChannel) return;
    
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          users!channel_messages_user_id_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const navigateToProfile = (targetUserId?: string | null) => {
    if (!targetUserId) return;
    if (user?.id === targetUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${targetUserId}`);
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
      // Refresh messages and scroll to bottom
      await fetchMessages();
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('community_channels')
        .insert({
          community_id: id,
          name: newChannelName.trim(),
          created_by: user.id,
          channel_type: 'text',
        });

      if (error) throw error;
      
      setNewChannelName('');
      setShowCreateChannel(false);
      await fetchChannels();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create channel');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8FAA7C" />
        <Text className="text-gray-600 mt-4">Loading community...</Text>
      </SafeAreaView>
    );
  }

  if (!community || !isMember(community.id)) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Access Denied</Text>
        <Text className="text-sm text-gray-600 mt-2 text-center">
          You need to join this community to view it.
        </Text>
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          {community.image_url ? (
            <Image source={{ uri: community.image_url }} className="w-10 h-10 rounded-xl mr-3" />
          ) : (
            <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
              <Text className="text-2xl">
                {community.category === 'Farming' && '🌱'}
                {community.category === 'Marketplace' && '🚜'}
                {community.category === 'Organic' && '🥕'}
                {community.category === 'Sustainability' && '♻️'}
                {community.category === 'Gardening' && '🌳'}
                {!community.category && '👥'}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {community.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Chat View with Toggleable Sidebars */}
      <View className="flex-1 flex-row relative">
        {/* Channels Sidebar (Left) */}
        <>
          <Animated.View
            pointerEvents={showChannelsSidebar ? 'auto' : 'none'}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 9,
              opacity: channelsOverlayOpacity,
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowChannelsSidebar(false)}
            />
          </Animated.View>
          <Animated.View
            pointerEvents={showChannelsSidebar ? 'auto' : 'none'}
            style={{
              width: 256,
              backgroundColor: '#F3F4F6',
              borderRightWidth: 1,
              borderRightColor: '#E5E7EB',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 10,
              transform: [{ translateX: channelsSidebarAnim }],
            }}
          >
            <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between bg-background-light">
              <Text className="text-sm font-semibold text-gray-900">Channels</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity onPress={() => setShowCreateChannel(true)}>
                  <Ionicons name="add" size={22} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowChannelsSidebar(false)}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView className="flex-1">
              {channels.length === 0 ? (
                <View className="px-4 py-6">
                  <Text className="text-sm text-gray-500 text-center mb-4">No channels yet</Text>
                  <TouchableOpacity
                    onPress={() => setShowCreateChannel(true)}
                    className="bg-primary px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-sm text-center font-semibold">Create Channel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                channels.map((channel) => (
                  <TouchableOpacity
                    key={channel.id}
                    onPress={() => {
                      setSelectedChannel(channel);
                      setShowChannelsSidebar(false);
                    }}
                    className={`px-4 py-3 flex-row items-center ${
                      selectedChannel?.id === channel.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                    }`}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={18}
                      color={selectedChannel?.id === channel.id ? '#8FAA7C' : '#6B7280'}
                    />
                    <Text
                      className={`ml-3 text-sm flex-1 ${
                        selectedChannel?.id === channel.id
                          ? 'text-primary font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {channel.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </>

        {/* Main Chat Area */}
        <View className="flex-1 bg-background-light">
          {/* Chat Header with Toggle Buttons */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200 bg-background-light">
            <TouchableOpacity
              onPress={() => setShowChannelsSidebar(!showChannelsSidebar)}
              className="mr-3"
            >
              <Ionicons name="menu" size={24} color="#374151" />
            </TouchableOpacity>
            {selectedChannel ? (
              <>
                <Ionicons name="chatbubbles-outline" size={20} color="#6B7280" />
                <Text className="text-base font-semibold text-gray-900 flex-1 ml-2">
                  {selectedChannel.name}
                </Text>
              </>
            ) : (
              <Text className="text-base font-semibold text-gray-900 flex-1">
                Select a channel
              </Text>
            )}
            <TouchableOpacity
              onPress={() => setShowMembersSidebar(!showMembersSidebar)}
              className="ml-3"
            >
              <Ionicons name="people" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Messages View */}
          {selectedChannel ? (
            <KeyboardAvoidingView
              className="flex-1"
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              {/* Messages List */}
              <FlatList
                ref={messagesListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item }) => (
                  <View className="px-4 py-2">
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => navigateToProfile(item.users?.id)}
                        activeOpacity={0.8}
                      >
                        {item.users?.profile_pic_url ? (
                          <Image
                            source={{ uri: item.users.profile_pic_url }}
                            className="w-10 h-10 rounded-full mr-3"
                          />
                        ) : (
                          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                            <Text className="text-white text-sm font-bold">
                              {item.users?.name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <TouchableOpacity
                            onPress={() => navigateToProfile(item.users?.id)}
                            activeOpacity={0.7}
                          >
                            <Text className="text-sm font-semibold text-gray-900">
                              {item.users?.name || 'Unknown'}
                            </Text>
                          </TouchableOpacity>
                          <Text className="text-xs text-gray-500 ml-2">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-700">{item.content}</Text>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingVertical: 12 }}
                ListEmptyComponent={
                  loadingMessages ? (
                    <View className="py-12 items-center">
                      <ActivityIndicator size="small" color="#8FAA7C" />
                    </View>
                  ) : (
                    <View className="py-12 items-center">
                      <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                      <Text className="text-gray-500 mt-4 text-lg font-semibold">No messages yet</Text>
                      <Text className="text-sm text-gray-400 mt-2">Start the conversation!</Text>
                    </View>
                  )
                }
              />

              {/* Message Input */}
              <View className="border-t border-gray-200 px-4 py-3 bg-background-light">
                <View className="flex-row items-center">
                  <TextInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder={`Message #${selectedChannel.name}`}
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 bg-background-light rounded-xl px-4 py-3 mr-2"
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className={`px-4 py-3 rounded-xl ${
                      !newMessage.trim() || sending ? 'bg-gray-300' : 'bg-primary'
                    }`}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="send" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="chatbubbles-outline" size={80} color="#D1D5DB" />
              <Text className="text-gray-500 mt-6 text-xl font-semibold">No channel selected</Text>
              <Text className="text-sm text-gray-400 mt-2">Open the channels sidebar to select a channel</Text>
              <TouchableOpacity
                onPress={() => setShowChannelsSidebar(true)}
                className="mt-6 bg-primary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Browse Channels</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Members Sidebar (Right) */}
        <>
          <Animated.View
            pointerEvents={showMembersSidebar ? 'auto' : 'none'}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 9,
              opacity: membersOverlayOpacity,
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowMembersSidebar(false)}
            />
          </Animated.View>
          <Animated.View
            pointerEvents={showMembersSidebar ? 'auto' : 'none'}
            style={{
              width: 256,
              backgroundColor: '#FFFFFF',
              borderLeftWidth: 1,
              borderLeftColor: '#E5E7EB',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 10,
              transform: [{ translateX: membersSidebarAnim }],
            }}
          >
            <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between bg-background-light">
              <Text className="text-sm font-semibold text-gray-900">
                Members ({members.length})
              </Text>
              <TouchableOpacity onPress={() => setShowMembersSidebar(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1">
              <View className="px-4 py-3">
                {members.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    className="flex-row items-center py-3 border-b border-gray-100"
                    activeOpacity={0.8}
                    onPress={() => navigateToProfile(member.users?.id)}
                  >
                    {member.users?.profile_pic_url ? (
                      <Image
                        source={{ uri: member.users.profile_pic_url }}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                        <Text className="text-white text-sm font-bold">
                          {member.users?.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-semibold text-gray-900 flex-1">
                          {member.users?.name || 'Unknown User'}
                        </Text>
                        {member.role === 'admin' && (
                          <View className="bg-red-100 px-2 py-0.5 rounded ml-2">
                            <Text className="text-xs font-semibold text-red-700">Admin</Text>
                          </View>
                        )}
                        {member.role === 'moderator' && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded ml-2">
                            <Text className="text-xs font-semibold text-blue-700">Mod</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </>
      </View>

      {/* Create Channel Modal */}
      <Modal
        visible={showCreateChannel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateChannel(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background-light rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Create Channel</Text>
              <TouchableOpacity onPress={() => setShowCreateChannel(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="Channel name"
              placeholderTextColor="#9CA3AF"
              className="bg-background-light rounded-xl px-4 py-3 mb-4 text-gray-900"
              autoFocus
              maxLength={50}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                }}
                className="flex-1 bg-gray-200 px-4 py-3 rounded-xl"
              >
                <Text className="text-center font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createChannel}
                disabled={!newChannelName.trim()}
                className={`flex-1 px-4 py-3 rounded-xl ${
                  !newChannelName.trim() ? 'bg-gray-300' : 'bg-primary'
                }`}
              >
                <Text className="text-center font-semibold text-white">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

