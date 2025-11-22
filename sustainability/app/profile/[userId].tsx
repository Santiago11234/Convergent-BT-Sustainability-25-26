import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/contexts/FollowContext';
import { Product, User } from '@/types';

type SellerProduct = Product & {
  seller: Pick<User, 'id' | 'name' | 'profile_pic_url' | 'is_verified_seller' | 'seller_rating' | 'review_count'> | null;
};

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isFollowing, followUser, unfollowUser } = useFollow();
  const [profile, setProfile] = useState<User | null>(null);
  const [listings, setListings] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (userId) {
      fetchProfile(userId);
      cleanup = setupRealtimeListener(userId);
    }

    return () => {
      // Cleanup real-time listener
      if (cleanup) {
        cleanup();
      }
    };
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

  const setupRealtimeListener = (targetUserId: string) => {
    const channel = supabase
      .channel(`profile_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${targetUserId}`,
        },
        (payload) => {
          console.log('Profile update received:', payload);
          setProfile((prev) => (prev ? { ...prev, ...payload.new } : null));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${targetUserId}`,
        },
        (payload) => {
          console.log('Follow change received for this user:', payload);
          // Reload profile to get updated follower count
          if (targetUserId) {
            fetchProfile(targetUserId);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleFollow = async () => {
    if (!user || !userId || user.id === userId) return;

    try {
      setFollowingLoading(true);
      const wasFollowing = isFollowing(userId);
      
      // Optimistically update follower count immediately
      if (profile) {
        setProfile({
          ...profile,
          follower_count: wasFollowing 
            ? Math.max(0, (profile.follower_count || 0) - 1)
            : (profile.follower_count || 0) + 1,
        });
      }
      
      if (wasFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      // Revert optimistic update on error
      if (profile && userId) {
        const wasFollowing = isFollowing(userId);
        setProfile({
          ...profile,
          follower_count: wasFollowing 
            ? (profile.follower_count || 0) + 1
            : Math.max(0, (profile.follower_count || 0) - 1),
        });
      }
      Alert.alert('Error', error.message || 'Failed to update follow status');
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleReport = async () => {
    if (!user || !userId || !reportReason.trim()) return;

    try {
      setReporting(true);
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: userId,
        report_type: 'account',
        reason: reportReason.trim(),
        description: reportDescription.trim() || null,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Success', 'Report submitted successfully. We will review it shortly.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setReporting(false);
    }
  };

  const isOwnProfile = user?.id === userId;
  const currentlyFollowing = isFollowing(userId || '');

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
        {!isOwnProfile && user && (
          <TouchableOpacity
            onPress={() => setShowReportModal(true)}
            className="p-2 -mr-2"
          >
            <Ionicons name="flag-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
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

            {/* Follow Button (if not own profile) */}
            {!isOwnProfile && user && (
              <TouchableOpacity
                onPress={handleFollow}
                disabled={followingLoading}
                className={`mt-4 px-6 py-2 rounded-xl ${
                  currentlyFollowing ? 'bg-gray-200' : 'bg-primary'
                }`}
              >
                {followingLoading ? (
                  <ActivityIndicator size="small" color={currentlyFollowing ? '#6B7280' : 'white'} />
                ) : (
                  <Text className={`font-semibold ${currentlyFollowing ? 'text-gray-700' : 'text-white'}`}>
                    {currentlyFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View className="flex-row mt-4 gap-6">
              <TouchableOpacity
                className="items-center"
                onPress={() => router.push(`/profile/followers/${userId}`)}
                activeOpacity={0.7}
              >
                <Text className="text-xl font-bold text-gray-900">{profile.follower_count || 0}</Text>
                <Text className="text-xs text-gray-600">Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center"
                onPress={() => router.push(`/profile/following/${userId}`)}
                activeOpacity={0.7}
              >
                <Text className="text-xl font-bold text-gray-900">{profile.following_count || 0}</Text>
                <Text className="text-xs text-gray-600">Following</Text>
              </TouchableOpacity>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">
                  {profile.seller_rating && profile.seller_rating > 0 
                    ? profile.seller_rating.toFixed(1) 
                    : 'Unrated'}
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

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Report Account</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Reason *</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="e.g., Spam, Harassment, Inappropriate content..."
                placeholderTextColor="#9CA3AF"
                value={reportReason}
                onChangeText={setReportReason}
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Additional Details</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 h-24 text-base border border-gray-200"
                placeholder="Provide more information (optional)"
                placeholderTextColor="#9CA3AF"
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDescription('');
                }}
                className="flex-1 bg-gray-200 px-4 py-3 rounded-xl"
              >
                <Text className="text-center font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReport}
                disabled={!reportReason.trim() || reporting}
                className={`flex-1 px-4 py-3 rounded-xl ${
                  !reportReason.trim() || reporting ? 'bg-gray-300' : 'bg-red-600'
                }`}
              >
                {reporting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-center font-semibold text-white">Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

