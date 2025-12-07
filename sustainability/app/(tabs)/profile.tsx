import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TextInput, Modal, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { User, Post } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { products, loadProducts } = useMarketplace();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings'>('posts');
  const [suggestedUsers, setSuggestedUsers] = useState<Pick<User, 'id' | 'name' | 'profile_pic_url' | 'email'>[]>([]);
  
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const myProducts = products.filter(product => product.seller_id === user?.id);

  useEffect(() => {
    loadUserProfile();
    if (loadProducts) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadUserPosts();
      loadSuggestedUsers();
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
        setEditName(data.name || '');
        setEditBio(data.bio || '');
        setEditPhone(data.phone || '');
        setEditEmail(data.email || '');
        setEditLocation(data.address || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadSuggestedUsers = async () => {
    if (!user?.id) return;

    try {
      // Get users that the current user is not following, excluding themselves
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      const excludeIds = [user.id, ...followingIds];

      let query = supabase
        .from('users')
        .select('id, name, profile_pic_url, email')
        .neq('id', user.id)
        .limit(10);

      // Filter out users that are already being followed
      if (followingIds.length > 0) {
        for (const id of followingIds) {
          query = query.neq('id', id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading suggested users:', error);
      } else {
        // Filter in JavaScript as a fallback
        const filtered = (data || []).filter(u => !excludeIds.includes(u.id)).slice(0, 5);
        setSuggestedUsers(filtered as Pick<User, 'id' | 'name' | 'profile_pic_url' | 'email'>[]);
      }
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      // Note: Email update may require re-authentication in Supabase Auth
      // For now, we'll just update the users table
      const { error } = await supabase
        .from('users')
        .update({
          name: editName,
          bio: editBio,
          phone: editPhone || null,
          address: editLocation || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      setShowEditModal(false);
      loadUserProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return 'Not provided';
    // Simple formatting: (123) 456-7890
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
          // Navigate to post detail if you have a route
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

  const renderProductGridItem = ({ item, index }: { item: typeof products[0]; index: number }) => {
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8FAA7C" />
          <Text className="text-gray-600 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <View className="relative h-48 bg-primary/20 overflow-hidden">
          {/* You can replace this with an actual banner image URL from profile */}
          <View className="absolute top-4 right-4 flex-row gap-2">
            <TouchableOpacity
              onPress={() => Alert.alert('Share', 'Share profile')}
              className="w-8 h-8 bg-black/30 rounded-full items-center justify-center"
            >
              <Ionicons name="share-outline" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              className="w-8 h-8 bg-black/30 rounded-full items-center justify-center"
            >
              <Ionicons name="settings-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Picture with Edit Icon */}
        <View className="items-center -mt-16 mb-4">
          <View className="relative">
            <View className="w-32 h-32 rounded-full bg-background-light items-center justify-center overflow-hidden border-4 border-background shadow-lg">
              {profile?.profile_pic_url ? (
                <Image
                  source={{ uri: profile.profile_pic_url }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Ionicons name="person" size={64} color="#9CA3AF" />
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-background shadow-sm"
            >
              <Ionicons name="pencil" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Information */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-center mb-2">
            <Text className="text-2xl font-bold text-gray-900">
              {profile?.name || user?.email?.split('@')[0] || 'User'}
            </Text>
            {profile?.is_verified_seller && (
              <View className="ml-2 w-5 h-5 bg-black rounded-full items-center justify-center">
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </View>
          
          <Text className="text-sm text-gray-600 text-center mb-4">
            @{profile?.name?.toLowerCase().replace(/\s+/g, '_') || user?.email?.split('@')[0] || 'user'}
          </Text>

          {/* Location */}
          {profile?.address && (
            <Text className="text-sm text-gray-700 text-center mb-3">{profile.address}</Text>
          )}

          {/* Phone and Email */}
          <View className="mb-4">
            {profile?.phone && (
              <View className="flex-row items-center justify-center mb-2">
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">{formatPhoneNumber(profile.phone)}</Text>
              </View>
            )}
            {user?.email && (
              <View className="flex-row items-center justify-center">
                <Ionicons name="mail-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">{user.email}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row justify-center gap-8 mt-4 mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push(`/profile/followers/${user?.id}`)}
              activeOpacity={0.7}
            >
              <Text className="text-xl font-bold text-gray-900">{profile?.follower_count || 0}</Text>
              <Text className="text-xs text-gray-600 mt-1">Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push(`/profile/following/${user?.id}`)}
              activeOpacity={0.7}
            >
              <Text className="text-xl font-bold text-gray-900">{profile?.following_count || 0}</Text>
              <Text className="text-xs text-gray-600 mt-1">Following</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-xl font-bold text-gray-900">
                {profile?.seller_rating && profile.seller_rating > 0 
                  ? profile.seller_rating.toFixed(1) 
                  : 'Unrated'}
              </Text>
              {profile?.review_count && profile.review_count > 0 ? (
                <Text className="text-xs text-gray-600 mt-1">({profile.review_count})</Text>
              ) : (
                <Text className="text-xs text-gray-600 mt-1">Rating</Text>
              )}
            </View>
          </View>

          {/* Suggested for you */}
          {suggestedUsers.length > 0 && (
            <View className="mt-6 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-900">Suggested for you</Text>
                <TouchableOpacity onPress={loadSuggestedUsers}>
                  <Text className="text-sm text-primary">View all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {suggestedUsers.map((suggestedUser, index) => (
                  <TouchableOpacity
                    key={suggestedUser.id}
                    className="items-center mr-4"
                    onPress={() => router.push(`/profile/${suggestedUser.id}`)}
                    activeOpacity={0.7}
                  >
                    <View className="w-16 h-16 rounded-full bg-background-light items-center justify-center overflow-hidden mb-2">
                      {suggestedUser.profile_pic_url ? (
                        <Image
                          source={{ uri: suggestedUser.profile_pic_url }}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <Ionicons name="person" size={32} color="#9CA3AF" />
                      )}
                    </View>
                    <Text className="text-xs text-gray-700 text-center" numberOfLines={1}>
                      {suggestedUser.name || suggestedUser.email?.split('@')[0] || 'Name'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
              myProducts.length > 0 ? (
                <FlatList
                  data={myProducts}
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

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 mb-6 bg-background-light rounded-2xl p-4 shadow-sm flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-red-600 font-semibold ml-2">Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background-light rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-gray-900">Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-700 mb-2">Name</Text>
                <TextInput
                  className="bg-background-light rounded-2xl px-4 py-3.5 text-base"
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-700 mb-2">Email</Text>
                <TextInput
                  className="bg-background-light rounded-2xl px-4 py-3.5 text-base"
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-700 mb-2">Phone Number</Text>
                <TextInput
                  className="bg-background-light rounded-2xl px-4 py-3.5 text-base"
                  placeholder="(123) 456-7890"
                  placeholderTextColor="#9CA3AF"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-700 mb-2">Location</Text>
                <TextInput
                  className="bg-background-light rounded-2xl px-4 py-3.5 text-base"
                  placeholder="Enter your location"
                  placeholderTextColor="#9CA3AF"
                  value={editLocation}
                  onChangeText={setEditLocation}
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-bold text-gray-700 mb-2">Bio</Text>
                <TextInput
                  className="bg-gray-100 rounded-2xl px-4 py-3.5 h-24 text-base"
                  placeholder="Tell us about yourself"
                  placeholderTextColor="#9CA3AF"
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                className={`rounded-2xl py-4 items-center mb-4 ${isSaving ? 'bg-gray-300' : 'bg-primary'}`}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background-light rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-gray-900">Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Notifications settings coming soon!')}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
              <Text className="text-base font-bold text-gray-900">Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon!')}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
              <Text className="text-base font-bold text-gray-900">Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Help & support coming soon!')}
              className="py-4"
              activeOpacity={0.7}
            >
              <Text className="text-base font-bold text-gray-900">Help & Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
