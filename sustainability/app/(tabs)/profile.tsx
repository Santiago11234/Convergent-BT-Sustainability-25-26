import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TextInput, Modal, FlatList } from 'react-native';
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
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter to only show products created by the current user
  const myProducts = products.filter(product => product.seller_id === user?.id);

  useEffect(() => {
    loadUserProfile();
    if (loadProducts) {
      loadProducts();
    }
  }, [user]);

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
        console.log('Profile loaded:', data);
        console.log('Is Seller:', data?.is_seller);
        console.log('Is Verified Seller:', data?.is_verified_seller);
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

              // Reload products
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

  const renderProductCard = ({ item }: { item: typeof products[0] }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row">
        {/* Product Image */}
        <View className="w-20 h-20 rounded-xl bg-gray-100 mr-3">
          {item.images && item.images.length > 0 && item.images[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              className="w-full h-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-green-50">
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
              {item.title || 'Untitled Product'}
            </Text>
            <View className={`px-2 py-1 rounded-full ml-2 ${
              (item.quantity_available || 0) < 10 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Text className={`text-xs font-semibold ${
                (item.quantity_available || 0) < 10 ? 'text-orange-700' : 'text-green-700'
              }`}>
                {item.quantity_available || 0} in stock
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-primary">
              ${(item.price || 0).toFixed(2)}
              <Text className="text-sm text-gray-500 font-normal">/{item.unit_of_measure || 'unit'}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteProduct(item.id)}
              className="ml-2"
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900">Profile</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={28} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Card */}
        <View className="bg-white mt-4 mx-4 rounded-2xl p-6 shadow-sm">
          <View className="items-center">
            {/* Profile Picture */}
            <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-4 overflow-hidden">
              {profile?.profile_pic_url ? (
                <Image
                  source={{ uri: profile.profile_pic_url }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Ionicons name="person" size={48} color="#9CA3AF" />
              )}
            </View>

            {/* Name with verification badge */}
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl font-bold text-gray-900">
                {profile?.name || user?.email?.split('@')[0] || 'User'}
              </Text>
              {profile?.is_verified_seller ? (
                <View className="ml-2 bg-blue-500 rounded-full p-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              ) : profile?.is_seller ? (
                <View className="ml-2 bg-orange-500 rounded-full px-2 py-1">
                  <Text className="text-xs font-semibold text-white">Unverified Seller</Text>
                </View>
              ) : null}
            </View>

            {/* Email */}
            <Text className="text-sm text-gray-600">{user?.email}</Text>

            {/* Bio */}
            <View className="mt-4 w-full">
              <Text className="text-sm text-gray-600 text-center">
                {profile?.bio || 'No bio yet'}
              </Text>
            </View>

            {/* Stats from profile */}
            {profile && (
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
                  <Text className="text-xl font-bold text-gray-900">{profile.seller_rating || 0}</Text>
                  <Text className="text-xs text-gray-600">Rating</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* My Products Section */}
        {myProducts.length > 0 && (
          <View className="mt-4 mb-4">
            <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 mb-3">My Products</Text>
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
        <View className="mt-4 mb-4">
          <TouchableOpacity
            onPress={() => setShowEditModal(true)}
            className="bg-white mx-4 rounded-2xl p-4 mb-2 shadow-sm flex-row items-center"
          >
            <Ionicons name="person-outline" size={24} color="#22C55E" />
            <Text className="text-base font-semibold text-gray-900 ml-3">Edit Profile</Text>
            <View className="flex-1" />
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white mx-4 rounded-2xl p-4 shadow-sm flex-row items-center"
          >
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text className="text-base font-semibold text-red-600 ml-3">Logout</Text>
            <View className="flex-1" />
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Name</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Enter your name"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Bio</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 h-24 text-base border border-gray-200"
                placeholder="Tell us about yourself"
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              className="bg-primary rounded-xl py-4 items-center"
            >
              <Text className="text-white font-semibold text-base">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      {showSettings && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center" style={{ zIndex: 9999 }}>
          <View className="bg-white rounded-3xl p-6 w-5/6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Notifications settings coming soon!')}
              className="py-4 border-b border-gray-200"
            >
              <Text className="text-base font-semibold text-gray-900">Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon!')}
              className="py-4 border-b border-gray-200"
            >
              <Text className="text-base font-semibold text-gray-900">Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Help & support coming soon!')}
              className="py-4"
            >
              <Text className="text-base font-semibold text-gray-900">Help & Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
