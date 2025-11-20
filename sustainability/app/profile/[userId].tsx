import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Product, User } from '@/types';

type SellerProduct = Product & {
  seller: Pick<User, 'id' | 'name' | 'profile_pic_url' | 'is_verified_seller' | 'seller_rating' | 'review_count'> | null;
};

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [listings, setListings] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId]);

  const fetchProfile = async (targetUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: userData, error: userError }, { data: productsData, error: productsError }] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .single(),
        supabase
          .from('products')
          .select(`
            *,
            seller:users!products_seller_id_fkey (
              id,
              name,
              profile_pic_url,
              is_verified_seller,
              seller_rating,
              review_count
            )
          `)
          .eq('seller_id', targetUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ]);

      if (userError || productsError) {
        throw userError || productsError;
      }

      setProfile(userData);
      setListings((productsData || []) as SellerProduct[]);
    } catch (err: any) {
      console.error('Error loading public profile:', err);
      setError(err.message || 'Failed to load profile');
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/feed');
    }
  };

  const handleOpenProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="text-gray-600 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Unable to load profile</Text>
        {error && <Text className="text-sm text-gray-600 mt-2 text-center">{error}</Text>}
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
          onPress={handleBack}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2 mr-2">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
          Profile
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="bg-white mt-4 mx-4 rounded-2xl p-6 shadow-sm border border-gray-100">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-4 overflow-hidden">
              {profile.profile_pic_url ? (
                <Image source={{ uri: profile.profile_pic_url }} className="w-full h-full rounded-full" />
              ) : (
                <Ionicons name="person" size={48} color="#9CA3AF" />
              )}
            </View>

            <View className="flex-row items-center mb-2">
              <Text className="text-2xl font-bold text-gray-900">
                {profile.name || profile.email?.split('@')[0] || 'User'}
              </Text>
              {profile.is_verified_seller && (
                <View className="ml-2 bg-blue-500 rounded-full p-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </View>

            <Text className="text-sm text-gray-600">{profile.email}</Text>

            {profile.bio && (
              <Text className="text-sm text-gray-600 text-center mt-4">{profile.bio}</Text>
            )}

            <View className="flex-row mt-4 gap-6">
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.follower_count || 0}</Text>
                <Text className="text-xs text-gray-600">Followers</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.following_count || 0}</Text>
                <Text className="text-xs text-gray-600">Following</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">
                  {profile.seller_rating ? profile.seller_rating.toFixed(1) : '0.0'}
                </Text>
                <Text className="text-xs text-gray-600">Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sell Orders */}
        <View className="bg-white mt-4 mx-4 rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Active Sell Orders</Text>
            <Text className="text-sm text-gray-500">{listings.length} items</Text>
          </View>

          {listings.length === 0 ? (
            <View className="items-center justify-center py-8 bg-gray-50 rounded-xl">
              <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
              <Text className="text-sm text-gray-500 mt-3">No active sell orders</Text>
            </View>
          ) : (
            listings.map((product, index) => {
              const isLast = index === listings.length - 1;
              return (
              <TouchableOpacity
                key={product.id}
                className={`flex-row items-center mb-4 pb-4 border-b border-gray-100 ${
                  isLast ? 'border-b-0 mb-0 pb-0' : ''
                }`}
                activeOpacity={0.8}
                onPress={() => handleOpenProduct(product.id)}
              >
                <View className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden mr-3">
                  {product.images && product.images.length > 0 && product.images[0] ? (
                    <Image source={{ uri: product.images[0] }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full items-center justify-center bg-green-50">
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                    {product.title || 'Untitled Product'}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                    {product.description || 'No description provided.'}
                  </Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                      <Text className="text-xs text-gray-500 font-normal">
                        /{product.unit_of_measure || 'unit'}
                      </Text>
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        (product.quantity_available || 0) < 10 ? 'bg-orange-100' : 'bg-green-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          (product.quantity_available || 0) < 10 ? 'text-orange-700' : 'text-green-700'
                        }`}
                      >
                        {product.quantity_available || 0} in stock
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

