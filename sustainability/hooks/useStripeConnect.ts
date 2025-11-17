import { useState, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface StripeConnectStatus {
  isOnboarded: boolean;
  stripeAccountId: string | null;
  loading: boolean;
}

export function useStripeConnect() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeConnectStatus>({
    isOnboarded: false,
    stripeAccountId: null,
    loading: true,
  });
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setStatus({ isOnboarded: false, stripeAccountId: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setStatus({
        isOnboarded: data?.stripe_onboarding_complete || false,
        stripeAccountId: data?.stripe_account_id || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setStatus({ isOnboarded: false, stripeAccountId: null, loading: false });
    }
  };

  const startOnboarding = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to start onboarding');
      return;
    }

    setOnboardingLoading(true);

    try {
      // Call Supabase Edge Function to create/get Stripe Connect account
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { userId: user.id },
      });

      if (error) {
        console.error('Onboarding error:', error);
        Alert.alert('Error', error.message || 'Failed to start onboarding');
        return;
      }

      if (data?.url) {
        // Open Stripe Connect onboarding URL
        const canOpen = await Linking.canOpenURL(data.url);

        if (canOpen) {
          await Linking.openURL(data.url);

          // Show info alert
          Alert.alert(
            'Complete Onboarding',
            'Please complete the Stripe onboarding process in your browser. Once complete, come back to this app and refresh.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Optionally refresh status after a delay
                  setTimeout(() => {
                    checkOnboardingStatus();
                  }, 2000);
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Cannot open onboarding URL');
        }
      } else {
        Alert.alert('Error', 'No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Error starting onboarding:', error);
      Alert.alert('Error', error.message || 'Failed to start onboarding');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const refreshOnboardingStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    await checkOnboardingStatus();
  };

  return {
    ...status,
    onboardingLoading,
    startOnboarding,
    refreshOnboardingStatus,
  };
}
