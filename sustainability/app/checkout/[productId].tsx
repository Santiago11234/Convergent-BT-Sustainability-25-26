import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8FAA7C" />
        <Text className="text-gray-600 mt-4">Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Product Not Found</Text>
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 py-3 border-b border-gray-100 flex-row items-center">
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
        <View className="bg-white p-4 mb-3">
          <Text className="text-sm font-semibold text-gray-500 mb-3">ORDER SUMMARY</Text>
          <View className="flex-row">
            {/* Product Image */}
            <View className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden mr-3">
              {product.images && product.images.length > 0 && product.images[0] ? (
                <Image
                  source={{ uri: product.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-green-50">
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
        <View className="bg-white p-4 mb-3">
          <Text className="text-sm font-semibold text-gray-500 mb-3">QUANTITY</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center bg-gray-100 rounded-xl">
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
        <View className="bg-white p-4 mb-3">
          <Text className="text-sm font-semibold text-gray-500 mb-3">PRICE BREAKDOWN</Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-700">Subtotal</Text>
            <Text className="text-gray-900 font-semibold">${totalPrice.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <View className="flex-row items-center">
              <Text className="text-gray-700">Platform Fee</Text>
              <View className="ml-1 bg-gray-100 px-2 py-0.5 rounded">
                <Text className="text-xs text-gray-600">10%</Text>
              </View>
            </View>
            <Text className="text-gray-900">-${platformFee.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-700">Payment Processing</Text>
            <Text className="text-gray-900">~${stripeFee.toFixed(2)}</Text>
          </View>

          <View className="border-t border-gray-200 pt-3 flex-row justify-between">
            <Text className="text-lg font-bold text-gray-900">Total</Text>
            <Text className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</Text>
          </View>

          <View className="mt-3 p-3 bg-green-50 rounded-lg">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#16A34A" />
              <Text className="text-xs text-green-700 ml-1 flex-1">
                Seller receives: ${sellerReceives.toFixed(2)} after fees
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Method */}
        {product.delivery_options && product.delivery_options.length > 0 && (
          <View className="bg-white p-4 mb-3">
            <Text className="text-sm font-semibold text-gray-500 mb-3">DELIVERY OPTIONS</Text>
            <View className="flex-row flex-wrap gap-2">
              {product.delivery_options.map((option, index) => (
                <View key={index} className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg">
                  <Ionicons
                    name={option === 'pickup' ? 'basket-outline' : option === 'local_delivery' ? 'car-outline' : 'airplane-outline'}
                    size={16}
                    color="#6B7280"
                  />
                  <Text className="text-gray-700 font-medium text-sm ml-2 capitalize">
                    {option.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-xs text-gray-500 mt-2">
              You can arrange delivery details with the seller after payment
            </Text>
          </View>
        )}

        {/* Important Info */}
        <View className="bg-blue-50 p-4 mx-4 mb-4 rounded-xl">
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</Text>
              <Text className="text-xs text-blue-700">
                Your payment is processed securely through Stripe. The seller will be notified once payment is confirmed.
              </Text>
            </View>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Bottom Payment Button */}
      <View className="bg-white border-t border-gray-200 px-4 py-3">
        <TouchableOpacity
          onPress={handlePayment}
          disabled={loading || quantity < 1}
          className={`py-4 rounded-xl items-center ${
            loading || quantity < 1 ? 'bg-gray-300' : 'bg-primary'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                Pay ${totalPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <Text className="text-xs text-gray-500 text-center mt-2">
          By completing this purchase, you agree to our Terms of Service
        </Text>
      </View>

      {/* Success Modal */}
      {showSuccess && (
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0 bg-black/50 items-center justify-center"
        >
          <View className="bg-white rounded-3xl p-8 mx-6 items-center shadow-2xl">
            {/* Success Icon */}
            <View className="bg-green-100 rounded-full p-6 mb-6">
              <Ionicons name="checkmark-circle" size={80} color="#8FAA7C" />
            </View>

            {/* Success Message */}
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Successful Transaction!
            </Text>

            <Text className="text-base text-gray-600 text-center mb-6">
              Your order has been confirmed
            </Text>

            {/* Pickup Details */}
            <View className="bg-blue-50 rounded-2xl p-6 w-full mb-6">
              <Text className="text-base font-bold text-blue-900 mb-4">
                Remember to pickup at:
              </Text>

              <View className="flex-row items-start">
                <Ionicons name="location" size={24} color="#3B82F6" className="mt-1" />
                <View className="flex-1 ml-3">
                  
                  <Text className="text-base text-blue-800">
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
              className="bg-primary px-8 py-5 rounded-xl w-full items-center mb-3"
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
              className="bg-gray-100 px-8 py-5 rounded-xl w-full items-center"
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
