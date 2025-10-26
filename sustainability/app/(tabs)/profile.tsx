import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
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
