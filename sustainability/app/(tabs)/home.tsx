import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cardAnimations = [
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.9)).current,
  ];

  useEffect(() => {
    cardAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
        delay: index * 100,
      }).start();
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        className="flex-1"
      >
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
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-6">
            <View className="flex-row gap-4 mb-4">
              {/* Discover carrot sellers */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[0] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/marketplace')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Discover carrot sellers
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Find a Community */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[1] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Find a Community
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View className="flex-row gap-4 mb-4">
              {/* Read story */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[2] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Read story
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Discover fresh leafy greens */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[3] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/marketplace')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Discover fresh leafy greens
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View className="flex-row gap-4 mb-6">
              {/* Create your profile */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[4] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Create your profile
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Become a seller */}
              <Animated.View
                style={{ transform: [{ scale: cardAnimations[5] }], opacity: fadeAnim }}
                className="flex-1"
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-gray-200 h-36 shadow-sm"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/seller')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-white font-black text-base">
                      Become a seller
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Featuring Section */}
            <View className="mb-6">
              <Text className="text-2xl font-black text-gray-900 mb-4">
                Featuring in Austin this week
              </Text>

              <Animated.View
                style={{ transform: [{ scale: cardAnimations[0] }], opacity: fadeAnim }}
              >
                <TouchableOpacity
                  className="rounded-3xl overflow-hidden bg-white shadow-sm"
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600' }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/50 justify-end p-4">
                    <Text className="text-base text-white font-black">
                      Farmer&apos;s market at the University of Texas at Austin
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Create a Post Button */}
            <View className="pb-6">
              <Animated.View
                style={{ transform: [{ scale: fadeAnim }], opacity: fadeAnim }}
              >
                <TouchableOpacity
                  className="bg-primary py-5 rounded-3xl items-center shadow-lg"
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/createProduct')}
                >
                  <Text className="text-white font-black text-lg">
                    Create a post
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
