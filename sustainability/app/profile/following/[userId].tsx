import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFollow } from '@/contexts/FollowContext';
import { User } from '@/types';

export default function FollowingListScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { getFollowing } = useFollow();
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadFollowing();
    }
  }, [userId]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      const users = await getFollowing(userId);
      setFollowing(users);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToProfile = (targetUserId: string) => {
    router.push(`/profile/${targetUserId}`);
  };

  const renderFollowing = ({ item }: { item: User }) => (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white"
      activeOpacity={0.7}
      onPress={() => navigateToProfile(item.id)}
    >
      <View className="w-12 h-12 rounded-full bg-gray-200 mr-3 items-center justify-center overflow-hidden">
        {item.profile_pic_url ? (
          <Image
            source={{ uri: item.profile_pic_url }}
            className="w-full h-full rounded-full"
          />
        ) : (
          <Ionicons name="person" size={24} color="#9CA3AF" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-base font-semibold text-gray-900">
            {item.name || item.email?.split('@')[0] || 'Unknown User'}
          </Text>
          {item.is_verified_seller && (
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
          )}
        </View>
        {item.bio && (
          <Text className="text-sm text-gray-600 mt-1" numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="text-gray-600 mt-4">Loading following...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">
          Following ({following.length})
        </Text>
      </View>

      {/* Following List */}
      {following.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text className="text-lg font-semibold text-gray-400 mt-4">Not following anyone</Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            This user isn't following anyone yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          renderItem={renderFollowing}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}


