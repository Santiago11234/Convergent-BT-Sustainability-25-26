import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen() {
  // Animation values
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const titleY = useSharedValue(-50);
  const subtitleY = useSharedValue(50);
  const card1Scale = useSharedValue(0);
  const card2Scale = useSharedValue(0);
  const card3Scale = useSharedValue(0);
  const ctaY = useSharedValue(100);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Logo entrance - subtle
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    logoRotate.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });

    // Title slide in - reduced bounce
    titleY.value = withDelay(200, withSpring(0, { damping: 20, stiffness: 150 }));

    // Subtitle slide in - reduced bounce
    subtitleY.value = withDelay(300, withSpring(0, { damping: 20, stiffness: 150 }));

    // Cards pop in with stagger - reduced bounce
    card1Scale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 150 }));
    card2Scale.value = withDelay(500, withSpring(1, { damping: 15, stiffness: 150 }));
    card3Scale.value = withDelay(600, withSpring(1, { damping: 15, stiffness: 150 }));

    // CTA slide up - reduced bounce
    ctaY.value = withDelay(700, withSpring(0, { damping: 20, stiffness: 150 }));

    // Continuous float - very subtle
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: subtitleY.value }],
  }));

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }],
  }));

  const card2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }],
  }));

  const card3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card3Scale.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ctaY.value }],
  }));

  const floatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View className="flex-1 bg-white">
      {/* Decorative circles */}
      <View className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-green-50 opacity-70" />
      <View className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-green-50 opacity-50" />

      <ScrollView
        className="flex-1"
        // contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="items-center px-6 pt-20 pb-12">
          {/* Animated Logo */}
          <Animated.View style={[logoAnimatedStyle]} className="mb-8">
            <View className="w-24 h-24 rounded-3xl bg-green-100 items-center justify-center shadow-lg shadow-green-500/30">
              <Ionicons name="leaf" size={52} color="#22C55E" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={titleAnimatedStyle} className="items-center">
            <Text className="text-5xl font-black text-gray-900 text-center tracking-tight">
              Farm Fresh
            </Text>
            <Text className="text-5xl font-black text-primary text-center tracking-tight -mt-2">
              From Neighbors
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={subtitleAnimatedStyle} className="mt-6">
            <Text className="text-base text-gray-600 text-center leading-6 px-4">
              Connect with local suburban farmers, buy fresh produce, and learn sustainable growing practices
            </Text>
          </Animated.View>
        </View>

        {/* Feature Cards */}
        <View className="px-6 gap-4 mb-10">
          {/* Card 1 */}
          <Animated.View style={card1AnimatedStyle}>
            <View className="bg-white rounded-3xl p-6 border-2 border-green-100 shadow-sm shadow-primary/10">
              <View className="w-14 h-14 rounded-2xl bg-green-100 items-center justify-center mb-4">
                <Ionicons name="storefront" size={28} color="#22C55E" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Local Marketplace
              </Text>
              <Text className="text-sm text-gray-600 leading-5">
                Browse fresh produce from suburban farmers in your area
              </Text>
            </View>
          </Animated.View>

          {/* Card 2 */}
          <Animated.View style={card2AnimatedStyle}>
            <View className="bg-white rounded-3xl p-6 border-2 border-green-100 shadow-sm shadow-primary/10">
              <View className="w-14 h-14 rounded-2xl bg-green-100 items-center justify-center mb-4">
                <Ionicons name="book" size={28} color="#22C55E" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Learn & Share
              </Text>
              <Text className="text-sm text-gray-600 leading-5">
                Watch tutorials, read blogs, and discover farming tips from experts
              </Text>
            </View>
          </Animated.View>

          {/* Card 3 */}
          <Animated.View style={card3AnimatedStyle}>
            <View className="bg-white rounded-3xl p-6 border-2 border-green-100 shadow-sm shadow-primary/10">
              <View className="w-14 h-14 rounded-2xl bg-green-100 items-center justify-center mb-4">
                <Ionicons name="people" size={28} color="#22C55E" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Build Community
              </Text>
              <Text className="text-sm text-gray-600 leading-5">
                Connect with like-minded growers and support local agriculture
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* CTA Buttons */}
        <Animated.View style={ctaAnimatedStyle} className="px-6 gap-3 mb-10">
          <TouchableOpacity
            className="bg-primary rounded-2xl py-5 px-8 flex-row items-center justify-center gap-2 shadow-lg shadow-primary/40"
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-transparent border-2 border-primary rounded-2xl py-5 px-8 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-primary text-base font-semibold">Browse Products</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Section with Float Animation */}
        <Animated.View style={floatAnimatedStyle} className="mx-6 bg-green-50 rounded-3xl p-8">
          <View className="flex-row justify-around">
            <View className="items-center flex-1">
              <Text className="text-4xl font-black text-primary mb-1">500+</Text>
              <Text className="text-xs text-gray-600 text-center">Local Farmers</Text>
            </View>
            <View className="w-px bg-primary/20" />
            <View className="items-center flex-1">
              <Text className="text-4xl font-black text-primary mb-1">2K+</Text>
              <Text className="text-xs text-gray-600 text-center">Fresh Products</Text>
            </View>
            <View className="w-px bg-primary/20" />
            <View className="items-center flex-1">
              <Text className="text-4xl font-black text-primary mb-1">10K+</Text>
              <Text className="text-xs text-gray-600 text-center">Happy Buyers</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
