import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithGoogle, loading, user } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [showRoleSelection, setShowRoleSelection] = React.useState(false);

  const handleGoogleSignIn = async () => {
    console.log("Button pressed!"); // Test if button works at all
    try {
      setIsSigningIn(true);
      console.log("signing in with google");
      await signInWithGoogle();
      // Check if user needs to select a role
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user has a role set in their profile
        const { data: profile } = await supabase
          .from('users')
          .select('is_seller, has_set_role')
          .eq('id', session.user.id)
          .single();
        
        if (!profile?.is_seller && !profile?.has_set_role) {
          setShowRoleSelection(true);
        }
      }
      // Navigation will be handled by auth state change
      console.log("signed in successfully");
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRoleSelection = async (role: 'buyer' | 'seller') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isSeller = role === 'seller';
      
      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({ 
          is_seller: isSeller,
          has_set_role: true 
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user role:', error);
        Alert.alert('Error', 'Failed to save your preference');
        return;
      }

      setShowRoleSelection(false);
      
      if (isSeller) {
        Alert.alert(
          'Welcome, Seller!',
          'Set up your seller profile to start selling.'
        );
      }
    } catch (error) {
      console.error('Error in role selection:', error);
      Alert.alert('Error', 'Failed to save your preference');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#8FAA7C" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Decorative circles */}
      <View className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-green-50 opacity-70" />
      <View className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-green-50 opacity-50" />

      <View className="flex-1 items-center justify-center px-6">
        {/* Logo */}
        <View className="w-32 h-32 rounded-3xl bg-green-100 items-center justify-center shadow-lg shadow-green-500/30 mb-8">
          <Image
            source={require('@/assets/logos/logo.png')}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text className="text-5xl font-black text-gray-900 text-center tracking-tight">
          Welcome
        </Text>
        <Text className="text-5xl font-black text-primary text-center tracking-tight -mt-2 mb-4">
          Back
        </Text>

        {/* Subtitle */}
        <Text className="text-base text-gray-600 text-center leading-6 px-4 mb-12">
          Sign in to connect with local farmers and explore fresh produce
        </Text>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            paddingVertical: 20,
            paddingHorizontal: 32,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#E5E7EB',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
          activeOpacity={0.8}
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <ActivityIndicator size="small" color="#8FAA7C" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#EA4335" />
              <Text style={{
                color: '#111827',
                fontSize: 18,
                fontWeight: '600',
                marginLeft: 12
              }}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text className="text-xs text-gray-500 text-center px-8 mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleSelection}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleSelection(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md">
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
              Welcome! How will you use the app?
            </Text>
            <Text className="text-sm text-gray-600 text-center mb-6">
              Choose your primary purpose on the platform
            </Text>

            {/* Buyer Option */}
            <TouchableOpacity
              onPress={() => handleRoleSelection('buyer')}
              className="bg-green-50 rounded-2xl p-6 mb-4 border-2 border-green-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center mb-2">
                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center">
                  <Ionicons name="cart" size={24} color="#8FAA7C" />
                </View>
                <Text className="text-xl font-bold text-gray-900 ml-3">I'm a Buyer</Text>
              </View>
              <Text className="text-sm text-gray-600">
                Browse and purchase fresh produce from local sellers
              </Text>
            </TouchableOpacity>

            {/* Seller Option */}
            <TouchableOpacity
              onPress={() => handleRoleSelection('seller')}
              className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center mb-2">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="storefront" size={24} color="#3B82F6" />
                </View>
                <Text className="text-xl font-bold text-gray-900 ml-3">I'm a Seller</Text>
              </View>
              <Text className="text-sm text-gray-600">
                Sell your products and reach local customers
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
