import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function FeedScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        {/* Placeholder for Instagram-style feed */}
        <View className="flex-1 items-center justify-center">
          <Ionicons name="images-outline" size={64} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-400 mt-4">Feed Coming Soon</Text>
          <Text className="text-sm text-gray-400 mt-2">This will be your social media feed</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

