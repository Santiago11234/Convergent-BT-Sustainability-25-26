import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MarketplaceProvider } from '@/contexts/MarketplaceContext';
import { FeedProvider } from '@/contexts/FeedContext';
import { CommunityProvider } from '@/contexts/CommunityContext';
import FloatingAIAssistant from '@/components/FloatingAIAssistant';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Determine if we should show the floating AI assistant
  // Hide it on createProduct, createPost, and createCommunity screens
  const hiddenRoutes = ['createProduct', 'createPost', 'createCommunity'];
  const shouldShowAIButton = user && !loading && 
    segments[0] !== 'login' &&
    !hiddenRoutes.some(route => segments.includes(route));

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/[productId]" options={{ headerShown: false }} />
        <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="createPost" options={{ headerShown: false }} />
        <Stack.Screen name="createCommunity" options={{ headerShown: false }} />
        <Stack.Screen name="messages/index" options={{ headerShown: false }} />
        <Stack.Screen name="messages/[conversationId]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {shouldShowAIButton && <FloatingAIAssistant />}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MarketplaceProvider>
          <FeedProvider>
            <CommunityProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </ThemeProvider>
            </CommunityProvider>
          </FeedProvider>
        </MarketplaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
