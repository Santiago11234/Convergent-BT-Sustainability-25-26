import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/contexts/FollowContext';
import { Product, User, Post } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings'>('posts');

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (userId) {
      fetchProfile(userId);
      cleanup = setupRealtimeListener(userId);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [userId]);

  const fetchProfile = async (targetUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: userData, error: userError },
        { data: productsData, error: productsError },
        { data: postsData, error: postsError }
      ] = await Promise.all([
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
        supabase
          .from('posts')
          .select('*')
          .eq('author_id', targetUserId)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      ]);

      if (userError || productsError || postsError) {
        throw userError || productsError || postsError;
      }

      setProfile(userData);
      setListings((productsData || []) as SellerProduct[]);
      setPosts(postsData || []);
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

  const handleFollow = async () => {
    if (!user || !userId || user.id === userId) return;

    try {
      setFollowingLoading(true);
      const wasFollowing = isFollowing(userId);
      
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

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return 'Not provided';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const renderPostGridItem = ({ item, index }: { item: Post; index: number }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, marginBottom: 2 }}
        onPress={() => {
          console.log('Navigate to post:', item.id);
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-background-light items-center justify-center">
            {item.post_type === 'blog' && <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />}
            {item.post_type === 'video' && <Ionicons name="videocam-outline" size={32} color="#9CA3AF" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProductGridItem = ({ item, index }: { item: typeof listings[0]; index: number }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, marginBottom: 2 }}
        onPress={() => router.push(`/product/${item.id}`)}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-background-light items-center justify-center">
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const isOwnProfile = user?.id === userId;
  const currentlyFollowing = isFollowing(userId || '');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8FAA7C" />
        <Text className="text-gray-600 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 py-3 border-b border-gray-100 flex-row items-center">
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
        {/* Banner Image */}
        <View className="relative h-48 bg-primary/20 overflow-hidden">
        </View>

        {/* Profile Picture */}
        <View className="items-center -mt-16 mb-4">
          <View className="w-32 h-32 rounded-full bg-background-light items-center justify-center overflow-hidden border-4 border-background shadow-lg">
            {profile.profile_pic_url ? (
              <Image source={{ uri: profile.profile_pic_url }} className="w-full h-full rounded-full" />
            ) : (
              <Ionicons name="person" size={64} color="#9CA3AF" />
            )}
          </View>
        </View>

        {/* User Information */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-center mb-2">
            <Text className="text-2xl font-bold text-gray-900">
              {profile.name || profile.email?.split('@')[0] || 'User'}
            </Text>
            {profile.is_verified_seller && (
              <View className="ml-2 w-5 h-5 bg-black rounded-full items-center justify-center">
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </View>

          <Text className="text-sm text-gray-600 text-center mb-4">
            @{profile.name?.toLowerCase().replace(/\s+/g, '_') || profile.email?.split('@')[0] || 'user'}
          </Text>

          {/* Location */}
          {profile.address && (
            <Text className="text-sm text-gray-700 text-center mb-3">{profile.address}</Text>
          )}

          {/* Phone and Email */}
          <View className="mb-4">
            {profile.phone && (
              <View className="flex-row items-center justify-center mb-2">
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">{formatPhoneNumber(profile.phone)}</Text>
              </View>
            )}
            {profile.email && (
              <View className="flex-row items-center justify-center">
                <Ionicons name="mail-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">{profile.email}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons (if not own profile) */}
          {!isOwnProfile && user && (
            <View className="flex-row items-center justify-center gap-3 mb-4">
              <TouchableOpacity
                onPress={() => router.push(`/messages?userId=${userId}`)}
                className="w-10 h-10 rounded-full bg-background-light items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFollow}
                disabled={followingLoading}
                className={`px-6 py-2 rounded-xl ${
                  currentlyFollowing ? 'bg-background-light' : 'bg-primary'
                }`}
                activeOpacity={0.7}
              >
                {followingLoading ? (
                  <ActivityIndicator size="small" color={currentlyFollowing ? '#6B7280' : 'white'} />
                ) : (
                  <Text className={`font-semibold ${currentlyFollowing ? 'text-gray-700' : 'text-white'}`}>
                    {currentlyFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert('Share', 'Share profile')}
                className="w-10 h-10 rounded-full bg-background-light items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
          )}

          {/* Stats */}
          <View className="flex-row justify-center gap-8 mt-4 mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push(`/profile/followers/${userId}`)}
              activeOpacity={0.7}
            >
              <Text className="text-xl font-bold text-gray-900">{profile.follower_count || 0}</Text>
              <Text className="text-xs text-gray-600 mt-1">Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push(`/profile/following/${userId}`)}
              activeOpacity={0.7}
            >
              <Text className="text-xl font-bold text-gray-900">{profile.following_count || 0}</Text>
              <Text className="text-xs text-gray-600 mt-1">Following</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-xl font-bold text-gray-900">
                {profile.seller_rating && profile.seller_rating > 0 
                  ? profile.seller_rating.toFixed(1) 
                  : 'Unrated'}
              </Text>
              {profile.review_count && profile.review_count > 0 ? (
                <Text className="text-xs text-gray-600 mt-1">({profile.review_count})</Text>
              ) : (
                <Text className="text-xs text-gray-600 mt-1">Rating</Text>
              )}
            </View>
          </View>

          {/* Tabs */}
          <View className="flex-row border-b border-gray-200 mb-4 mt-4">
            <TouchableOpacity
              className={`flex-1 py-3 items-center ${
                activeTab === 'posts' ? 'border-b-2 border-primary' : ''
              }`}
              onPress={() => setActiveTab('posts')}
              activeOpacity={0.7}
            >
              <Text className={`font-semibold ${activeTab === 'posts' ? 'text-primary' : 'text-gray-500'}`}>
                Posts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 items-center ${
                activeTab === 'listings' ? 'border-b-2 border-primary' : ''
              }`}
              onPress={() => setActiveTab('listings')}
              activeOpacity={0.7}
            >
              <Text className={`font-semibold ${activeTab === 'listings' ? 'text-primary' : 'text-gray-500'}`}>
                Active Listings
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Grid */}
          <View className="flex-row flex-wrap mb-6">
            {activeTab === 'posts' ? (
              posts.length > 0 ? (
                <FlatList
                  data={posts}
                  renderItem={renderPostGridItem}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 2 }}
                />
              ) : (
                <View className="w-full py-8 items-center">
                  <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-2">No posts yet</Text>
                </View>
              )
            ) : (
              listings.length > 0 ? (
                <FlatList
                  data={listings}
                  renderItem={renderProductGridItem}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 2 }}
                />
              ) : (
                <View className="w-full py-8 items-center">
                  <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-2">No active listings</Text>
                </View>
              )
            )}
          </View>
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
          <View className="bg-background-light rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Report Account</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Reason *</Text>
              <TextInput
                className="bg-background-light rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="e.g., Spam, Harassment, Inappropriate content..."
                placeholderTextColor="#9CA3AF"
                value={reportReason}
                onChangeText={setReportReason}
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Additional Details</Text>
              <TextInput
                className="bg-background-light rounded-xl px-4 py-3 h-24 text-base border border-gray-200"
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
                className="flex-1 bg-background-light px-4 py-3 rounded-xl"
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
