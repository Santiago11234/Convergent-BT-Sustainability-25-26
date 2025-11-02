import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCommunity, Community } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCommunities();
    setRefreshing(false);
  };

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
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-3xl font-black text-gray-900">Communities</Text>
            <Text className="text-sm text-gray-600 mt-1">
              Join communities and connect with others
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/createCommunity')}
            className="bg-primary px-4 py-2 rounded-xl flex-row items-center ml-4"
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Create</Text>
          </TouchableOpacity>
        </View>
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
    </SafeAreaView>
  );
}
