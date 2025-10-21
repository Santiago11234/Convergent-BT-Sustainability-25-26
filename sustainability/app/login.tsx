import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithGoogle, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleGoogleSignIn = async () => {
    console.log("Button pressed!"); // Test if button works at all
    try {
      setIsSigningIn(true);
      console.log("signing in with google");
      await signInWithGoogle();
      // Navigation will be handled by auth state change
      console.log("signed in successfully");
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
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
          <Ionicons name="leaf" size={64} color="#22C55E" />
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
            <ActivityIndicator size="small" color="#22C55E" />
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
    </View>
  );
}
