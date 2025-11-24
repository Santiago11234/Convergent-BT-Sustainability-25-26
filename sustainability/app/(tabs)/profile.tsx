import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TextInput, Modal, FlatList, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { products, loadProducts } = useMarketplace();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const myProducts = products.filter(product => product.seller_id === user?.id);

  useEffect(() => {
    loadUserProfile();
    if (loadProducts) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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
      const { error } = await supabase
        .from('users')
        .update({
          name: editName,
          bio: editBio,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      setShowEditModal(false);
      loadUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

              if (error) {
                Alert.alert('Error', 'Failed to delete product');
                return;
              }

              if (loadProducts) {
                await loadProducts();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  // Separate component for product card to use hooks properly
  const ProductCard = ({ 
    item, 
    index, 
    router, 
    handleDeleteProduct 
  }: { 
    item: typeof products[0]; 
    index: number; 
    router: any;
    handleDeleteProduct: (id: string) => void;
  }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current; // Start at 1 (no scale)
    const hasAnimated = React.useRef(false);

    React.useEffect(() => {
      if (!hasAnimated.current) {
        scaleAnim.setValue(0.95);
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
          delay: index * 30,
        }).start();
        hasAnimated.current = true;
      }
    }, []);

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          className="bg-white rounded-3xl overflow-hidden mb-3 shadow-sm"
          activeOpacity={0.9}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          <View className="flex-row p-4">
            <View className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden mr-4">
              {item.images && item.images.length > 0 && item.images[0] ? (
                <Image
                  source={{ uri: item.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-green-50">
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View className="flex-1">
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-lg font-bold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                  {item.title || 'Untitled Product'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteProduct(item.id)}
                  className="p-2 -mr-2"
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between">
                <View className={`px-2 py-1 rounded-full ${
                  (item.quantity_available || 0) < 10 ? 'bg-orange-100' : 'bg-green-100'
                }`}>
                  <Text className={`text-xs font-semibold ${
                    (item.quantity_available || 0) < 10 ? 'text-orange-700' : 'text-green-700'
                  }`}>
                    {item.quantity_available || 0} in stock
                  </Text>
                </View>
                <Text className="text-xl font-black text-primary">
                  ${(item.price || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderProductCard = ({ item, index }: { item: typeof products[0]; index: number }) => (
    <ProductCard
      item={item}
      index={index}
      router={router}
      handleDeleteProduct={handleDeleteProduct}
    />
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22C55E" />
          <Text className="text-gray-600 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            source={require('@/assets/logos/logo.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-black text-gray-900 ml-2">Profile</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Profile Card */}
          <View className="bg-white mt-6 mx-4 rounded-3xl p-8 shadow-sm overflow-hidden">
            <View className="items-center">
              {/* Profile Picture */}
              <View className="w-32 h-32 rounded-full bg-gray-100 items-center justify-center mb-5 overflow-hidden border-4 border-white shadow-lg">
                {profile?.profile_pic_url ? (
                  <Image
                    source={{ uri: profile.profile_pic_url }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Ionicons name="person" size={56} color="#9CA3AF" />
                )}
              </View>

              {/* Name with verification badge */}
              <View className="flex-row items-center mb-2">
                <Text className="text-3xl font-black text-gray-900">
                  {profile?.name || user?.email?.split('@')[0] || 'User'}
                </Text>
                {profile?.is_verified_seller ? (
                  <View className="ml-3 bg-blue-500 rounded-full p-1.5 shadow-sm">
                    <Ionicons name="checkmark" size={18} color="white" />
                  </View>
                ) : profile?.is_seller ? (
                  <View className="ml-3 bg-orange-500 rounded-full px-3 py-1 shadow-sm">
                    <Text className="text-xs font-bold text-white">Unverified</Text>
                  </View>
                ) : null}
              </View>

              {/* Email */}
              <Text className="text-sm text-gray-600 mb-4">{user?.email}</Text>

              {/* Bio */}
              {profile?.bio && (
                <View className="w-full mb-6">
                  <Text className="text-sm text-gray-700 text-center leading-5">
                    {profile.bio}
                  </Text>
                </View>
              )}

              {/* Stats */}
              {profile && (
                <View className="flex-row mt-2 gap-8">
                  <TouchableOpacity
                    className="items-center"
                    onPress={() => router.push(`/profile/followers/${user?.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-2xl font-black text-gray-900">{profile.follower_count || 0}</Text>
                    <Text className="text-xs font-semibold text-gray-600 mt-1">Followers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="items-center"
                    onPress={() => router.push(`/profile/following/${user?.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-2xl font-black text-gray-900">{profile.following_count || 0}</Text>
                    <Text className="text-xs font-semibold text-gray-600 mt-1">Following</Text>
                  </TouchableOpacity>
                  <View className="items-center">
                    <Text className="text-2xl font-black text-gray-900">
                      {profile.seller_rating && profile.seller_rating > 0 
                        ? profile.seller_rating.toFixed(1) 
                        : 'Unrated'}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-600 mt-1">Rating</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* My Products Section */}
          {myProducts.length > 0 && (
            <View className="mt-6 mb-4">
              <View className="bg-white mx-4 rounded-3xl p-6 shadow-sm">
                <Text className="text-xl font-black text-gray-900 mb-4">My Products</Text>
                <FlatList
                  data={myProducts}
                  renderItem={renderProductCard}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          )}

          {/* Menu Items */}
          <View className="mt-4 mb-6">
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              className="bg-white mx-4 rounded-3xl p-5 mb-3 shadow-sm flex-row items-center"
              activeOpacity={0.8}
            >
              <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                <Ionicons name="person-outline" size={24} color="#22C55E" />
              </View>
              <Text className="text-base font-bold text-gray-900 flex-1">Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              className="bg-white mx-4 rounded-3xl p-5 shadow-sm flex-row items-center"
              activeOpacity={0.8}
            >
              <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center mr-4">
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              </View>
              <Text className="text-base font-bold text-red-600 flex-1">Logout</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-gray-900">Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-gray-700 mb-2">Name</Text>
              <TextInput
                className="bg-gray-100 rounded-2xl px-4 py-3.5 text-base"
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                value={editName}
                onChangeText={setEditName}
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
              className={`rounded-2xl py-4 items-center ${isSaving ? 'bg-gray-300' : 'bg-primary'}`}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      {showSettings && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center" style={{ zIndex: 9999 }}>
          <View className="bg-white rounded-3xl p-6 w-5/6">
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
      )}
    </SafeAreaView>
  );
}
