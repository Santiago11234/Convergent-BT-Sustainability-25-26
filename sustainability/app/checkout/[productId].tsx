import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
// import { useStripe } from '@stripe/stripe-react-native'; // Commented out - Stripe to be implemented later
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ProductWithSeller } from '@/types/database.types';

export default function CheckoutScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  // const { initPaymentSheet, presentPaymentSheet } = useStripe(); // Commented out - Stripe to be implemented later
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductWithSeller | null>(null);
  const [fetchingProduct, setFetchingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setFetchingProduct(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data as unknown as ProductWithSeller);
    } catch (err) {
      console.error('Error fetching product:', err);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setFetchingProduct(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.quantity_available || 0)) {
      setQuantity(newQuantity);
    }
  };

  const handlePayment = async () => {
    if (!user || !product) return;

    /* STRIPE INTEGRATION - TO BE IMPLEMENTED LATER
    // Check if seller has completed Stripe onboarding
    if (!product.seller.stripe_account_id || !product.seller.stripe_onboarding_complete) {
      Alert.alert(
        'Seller Not Ready',
        'This seller has not completed their payment setup yet. Please try again later or contact the seller.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // Call your create-payment-intent function
      const { data: paymentData, error } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            productId,
            quantity,
            buyerId: user.id,
          },
        }
      );

      if (error) {
        console.error('Payment intent error:', error);

        // Handle specific error codes
        if (error.message?.includes('SELLER_NOT_ONBOARDED')) {
          Alert.alert(
            'Seller Not Ready',
            'This seller has not completed their payment setup yet.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', error.message || 'Failed to create payment');
        }
        return;
      }

      console.log('Payment intent created:', paymentData);

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Sustainability Marketplace',
        paymentIntentClientSecret: paymentData.clientSecret,
        defaultBillingDetails: {
          name: user.name,
          email: user.email,
        },
        returnURL: 'exp://checkout/success', // Deep link for your app
      });

      if (initError) {
        console.error('Init payment sheet error:', initError);
        Alert.alert('Error', initError.message);
        return;
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled
        console.log('Payment cancelled:', presentError.message);
        Alert.alert('Payment Cancelled', 'You can try again when ready.');
      } else {
        // Payment successful
        Alert.alert(
          'Payment Successful!',
          `Your order for ${quantity}x ${product.title} has been placed. The seller will be notified.`,
          [
            {
              text: 'View Orders',
              onPress: () => router.replace('/(tabs)/profile'),
            },
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      Alert.alert('Error', err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
    END OF STRIPE INTEGRATION */

    // TEMPORARY: Simulate payment processing with animation
    setLoading(true);

    // Simulate loading for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    setLoading(false);
    setShowSuccess(true);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleSellerProfile = () => {
    if (!product?.seller?.id) return;
    if (user?.id === product.seller.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${product.seller.id}`);
    }
  };

  if (fetchingProduct) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F1E8] items-center justify-center">
        <ActivityIndicator size="large" color="#4A6B3C" />
        <Text className="text-gray-600 mt-4">Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F1E8] items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Product Not Found</Text>
        <TouchableOpacity
          className="mt-6 bg-[#4A6B3C] px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalPrice = product.price * quantity;
  const platformFee = totalPrice * 0.10; // 10% platform fee
  const stripeFee = (totalPrice * 0.029) + 0.30; // Approximate Stripe fee
  const sellerReceives = totalPrice - platformFee - stripeFee;

  return (
    <SafeAreaView className="flex-1 bg-[#F5F1E8]" edges={['top']}>
      {/* Header */}
      <View className="bg-[#F5F1E8] px-4 py-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-2">Checkout</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Summary */}
        <View className="p-5 mb-3">
          <Text className="text-sm font-semibold text-gray-500 mb-3">ORDER SUMMARY</Text>
          <View className="flex-row">
            {/* Product Image */}
            <View className="w-20 h-20 rounded-xl bg-gray-200 overflow-hidden mr-3">
              {product.images && product.images.length > 0 && product.images[0] ? (
                <Image
                  source={{ uri: product.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-gray-200">
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900" numberOfLines={2}>
                {product.title}
              </Text>
              <TouchableOpacity
                className="flex-row items-center mt-1"
                activeOpacity={0.8}
                onPress={handleSellerProfile}
              >
                <Ionicons name="person-outline" size={14} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-1 underline">{product.seller.name}</Text>
              </TouchableOpacity>
              <Text className="text-sm text-gray-500 mt-1">
                ${product.price.toFixed(2)} per {product.unit_of_measure}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity Selector */}
        <View className="px-5 mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-3">QUANTITY</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center bg-gray-200 rounded-xl">
              <TouchableOpacity
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="p-3"
              >
                <Ionicons
                  name="remove"
                  size={24}
                  color={quantity <= 1 ? '#D1D5DB' : '#1F2937'}
                />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-900 mx-6">{quantity}</Text>
              <TouchableOpacity
                onPress={() => handleQuantityChange(1)}
                disabled={quantity >= product.quantity_available}
                className="p-3"
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={quantity >= product.quantity_available ? '#D1D5DB' : '#1F2937'}
                />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500">
              {product.quantity_available} available
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View className="px-5 mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-3">PRICE BREAKDOWN</Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-700">Subtotal</Text>
            <Text className="text-gray-900 font-semibold">${totalPrice.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <View className="flex-row items-center">
              <Text className="text-gray-700">Platform Fee</Text>
              <View className="ml-1 bg-gray-200 px-2 py-0.5 rounded">
                <Text className="text-xs text-gray-600">10%</Text>
              </View>
            </View>
            <Text className="text-gray-900">-${platformFee.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-700">Payment Processing</Text>
            <Text className="text-gray-900">~${stripeFee.toFixed(2)}</Text>
          </View>

          <View className="border-t border-gray-300 pt-3 flex-row justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900">Total</Text>
            <Text className="text-2xl font-bold text-[#4A6B3C]">${totalPrice.toFixed(2)}</Text>
          </View>

          <View className="p-3 bg-[#E0D3B4] rounded-lg">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#563D1F" />
              <Text className="text-xs text-[#563D1F] ml-1 flex-1">
                Seller receives: ${sellerReceives.toFixed(2)} after fees
              </Text>
            </View>
          </View>
        </View>

        {/* Pickup Location Map */}
        {product.pickup_location && (
          <View className="px-5 mb-4">
            <Text className="text-xl font-bold text-gray-900 mb-1">Pickup Location</Text>
            <Text className="text-sm text-gray-600 mb-4">Address</Text>
            <View className="rounded-2xl overflow-hidden h-64 mb-3">
              <MapView
                style={{ width: '100%', height: '100%' }}
                initialRegion={{
                  latitude: product.seller.location_lat || 37.78825,
                  longitude: product.seller.location_long || -122.4324,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: product.seller.location_lat || 37.78825,
                    longitude: product.seller.location_long || -122.4324,
                  }}
                  title={product.seller.name}
                  description={product.pickup_location}
                />
              </MapView>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="location" size={20} color="#6B7280" />
              <Text className="flex-1 text-gray-700 text-sm ml-2">{product.pickup_location}</Text>
            </View>
          </View>
        )}


        <View className="h-24" />
      </ScrollView>

      {/* Bottom Payment Button */}
      <SafeAreaView edges={['bottom']} className="bg-[#F5F1E8]">
        <View className="px-5 py-4">
          <TouchableOpacity
            onPress={handlePayment}
            disabled={loading || quantity < 1}
            className={`py-4 rounded-full items-center ${
              loading || quantity < 1 ? 'bg-gray-300' : 'bg-[#4A6B3C]'
            }`}
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Confirm Purchase
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Success Modal */}
      {showSuccess && (
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0 bg-black/50 items-center justify-center"
        >
          <View className="bg-white rounded-3xl p-8 mx-6 items-center shadow-2xl">
            {/* Success Icon */}
            <View className="bg-green-100 rounded-full p-6 mb-6">
              <Ionicons name="checkmark-circle" size={80} color="#4A6B3C" />
            </View>

            {/* Success Message */}
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Successful Transaction!
            </Text>

            <Text className="text-base text-gray-600 text-center mb-6">
              Your order has been confirmed
            </Text>

            {/* Pickup Details */}
            <View className="bg-green-50 rounded-2xl p-6 w-full mb-6">
              <Text className="text-base font-bold text-[#4A6B3C] mb-4">
                Remember to pickup at:
              </Text>

              <View className="flex-row items-start">
                <Ionicons name="location" size={24} color="#4A6B3C" className="mt-1" />
                <View className="flex-1 ml-3">
                  <Text className="text-base text-gray-800">
                    {product?.pickup_location || product?.seller?.address || 'Contact seller for pickup details'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={() => {
                setShowSuccess(false);
                router.back();
              }}
              className="bg-[#4A6B3C] px-8 py-5 rounded-full w-full items-center mb-3"
            >
              <Text className="text-white font-bold text-lg">
                Continue Shopping
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)/profile');
              }}
              className="bg-gray-200 px-8 py-5 rounded-full w-full items-center"
            >
              <Text className="text-gray-700 font-semibold text-lg">
                View My Orders
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
