import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-6 bg-white">
          <View className="flex-row items-center">
            <Image
              source={require('@/assets/logos/logo.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-black text-gray-900 ml-2">HomeGrown</Text>
          </View>
        </View>

        {/* Discovery Cards Grid */}
        <View className="px-6 pt-6 flex-1">
          <View className="flex-row gap-4 mb-4">
            {/* Discover carrot sellers */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/marketplace')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Discover carrot sellers
                </Text>
              </View>
            </TouchableOpacity>

            {/* Read story */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/community')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Find a Community
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-4 mb-4">
            {/* Read story */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/community')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Read story
                </Text>
              </View>
            </TouchableOpacity>

            {/* Discover fresh leafy greens */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/marketplace')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Discover fresh leafy greens
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-4 mb-6">
            {/* Create your profile */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Create your profile
                </Text>
              </View>
            </TouchableOpacity>

            {/* Become a seller */}
            <TouchableOpacity
              className="flex-1 rounded-2xl overflow-hidden bg-gray-200 h-32"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/seller')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-white font-bold text-base">
                  Become a seller
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Featuring Section */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Featuring in Austin this week
            </Text>

            <TouchableOpacity
              className="rounded-2xl overflow-hidden bg-white shadow-sm"
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600' }}
                className="w-full h-40"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/40 justify-end p-3">
                <Text className="text-sm text-white font-bold">
                  Farmer&apos;s market at the University of Texas at Austin
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Create a Post Button */}
          <View className="pb-6">
            <TouchableOpacity
              className="bg-primary py-4 rounded-2xl items-center"
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/createProduct')}
            >
              <Text className="text-white font-bold text-lg">
                Create a post
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
