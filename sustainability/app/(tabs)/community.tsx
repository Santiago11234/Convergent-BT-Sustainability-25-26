import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useAuth } from '@/contexts/AuthContext';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image: string;
  category: string;
}

const COMMUNITIES: Community[] = [
  {
    id: '1',
    name: 'Austin Urban Farm',
    description: 'Local sustainable farming in Austin',
    memberCount: 123,
    image: '🌱',
    category: 'Farming',
  },
  {
    id: '2',
    name: 'Texas Farmers Market',
    description: 'Connecting farmers and buyers in Texas',
    memberCount: 456,
    image: '🚜',
    category: 'Marketplace',
  },
  {
    id: '3',
    name: 'Organic Austin',
    description: 'Organic produce lovers',
    memberCount: 789,
    image: '🥕',
    category: 'Organic',
  },
  {
    id: '4',
    name: 'Sustainable Living',
    description: 'Living sustainably in Austin',
    memberCount: 234,
    image: '♻️',
    category: 'Sustainability',
  },
  {
    id: '5',
    name: 'Farm Fresh Austin',
    description: 'Fresh produce from local farms',
    memberCount: 567,
    image: '🌾',
    category: 'Farming',
  },
  {
    id: '6',
    name: 'Community Garden Network',
    description: 'Connect with local gardeners',
    memberCount: 345,
    image: '🌳',
    category: 'Gardening',
  },
];

export default function CommunityScreen() {
  const router = useRouter();
  const { products } = useMarketplace();
  const { user } = useAuth();

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      onPress={() => router.push(`/community/${item.id}`)}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
    >
      <View className="flex-row">
        {/* Community Image/Icon */}
        <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-4">
          <Text className="text-3xl">{item.image}</Text>
        </View>

        {/* Community Details */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="bg-primary/10 px-2 py-1 rounded-full">
              <Text className="text-xs font-semibold text-primary">{item.category}</Text>
            </View>
          </View>

          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>

          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1">{item.memberCount} members</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 mb-2">Communities</Text>
        <Text className="text-sm text-gray-600">Join communities and connect with local sellers</Text>
      </View>

      {/* Your Communities Section */}
      <View className="px-4 pt-4">
        <Text className="text-lg font-bold text-gray-900 mb-3">Join Communities</Text>
        
        {COMMUNITIES.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-semibold text-gray-400 mt-4">No communities yet</Text>
          </View>
        ) : (
          <FlatList
            data={COMMUNITIES}
            renderItem={renderCommunityCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

