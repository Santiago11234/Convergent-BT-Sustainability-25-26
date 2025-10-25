import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { ProductWithSeller } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { useConversations } from '@/hooks/useConversations';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getOrCreateConversation } = useConversations();
  const [product, setProduct] = useState<ProductWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setProduct(data as unknown as ProductWithSeller);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (product?.pickup_location) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(product.pickup_location)}`;
      Linking.openURL(url);
    }
  };

  const handleMessageSeller = async () => {
    if (!product) return;

    try {
      setMessagingLoading(true);
      const conversationId = await getOrCreateConversation(product.seller_id);

      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setMessagingLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="text-gray-600 mt-4">Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">Error Loading Product</Text>
        <Text className="text-sm text-gray-600 mt-2 text-center">{error || 'Product not found'}</Text>
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Product Details</Text>
        <TouchableOpacity className="p-2 -mr-2">
          <Ionicons name="share-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {product.images && product.images.length > 0 ? (
              product.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={{ width, height: 300 }}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View
                style={{ width, height: 300 }}
                className="bg-gray-100 items-center justify-center"
              >
                <Ionicons name="image-outline" size={64} color="#9CA3AF" />
              </View>
            )}
          </ScrollView>

          {/* Image Indicator */}
          {product.images && product.images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {product.images.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </View>
          )}

          {/* Stock Badge */}
          <View className="absolute top-4 right-4">
            <View className={`px-3 py-2 rounded-full ${
              product.quantity_available < 10 ? 'bg-orange-500' : 'bg-green-500'
            }`}>
              <Text className="text-white font-bold text-sm">
                {product.quantity_available} in stock
              </Text>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View className="px-4 py-5">
          {/* Title and Price */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                {product.title}
              </Text>
              {product.growing_method && (
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-100 px-3 py-1 rounded-full">
                    <Text className="text-blue-700 font-semibold text-xs capitalize">
                      {product.growing_method}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View className="items-end">
              <Text className="text-3xl font-bold text-primary">
                ${product.price.toFixed(2)}
              </Text>
              <Text className="text-sm text-gray-500">per {product.unit_of_measure}</Text>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-900 mb-2">Description</Text>
              <Text className="text-gray-600 leading-6">{product.description}</Text>
            </View>
          )}

          {/* Availability */}
          {(product.available_from || product.available_to) && (
            <View className="mb-5 p-4 bg-blue-50 rounded-xl">
              <View className="flex-row items-center mb-1">
                <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                <Text className="text-sm font-semibold text-blue-900 ml-2">Availability</Text>
              </View>
              <Text className="text-blue-700 text-sm">
                {product.available_from && `From ${new Date(product.available_from).toLocaleDateString()}`}
                {product.available_from && product.available_to && ' - '}
                {product.available_to && `To ${new Date(product.available_to).toLocaleDateString()}`}
              </Text>
            </View>
          )}

          {/* Delivery Options */}
          {product.delivery_options && product.delivery_options.length > 0 && (
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-900 mb-3">Delivery Options</Text>
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
            </View>
          )}

          {/* Seller Info */}
          <View className="mb-5 p-4 bg-gray-50 rounded-xl">
            <Text className="text-base font-semibold text-gray-900 mb-3">Seller Information</Text>
            <View className="flex-row items-center">
              {product.seller.profile_pic_url ? (
                <Image
                  source={{ uri: product.seller.profile_pic_url }}
                  className="w-14 h-14 rounded-full"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white text-xl font-bold">
                    {product.seller.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="flex-1 ml-3">
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold text-gray-900">{product.seller.name}</Text>
                  {product.seller.is_verified_seller && (
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" className="ml-1" />
                  )}
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    {product.seller.seller_rating.toFixed(1)}
                  </Text>
                  <Text className="text-sm text-gray-500 ml-1">
                    ({product.seller.review_count} reviews)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-primary px-4 py-2 rounded-lg"
                onPress={handleMessageSeller}
                disabled={messagingLoading}
              >
                <Text className="text-white font-semibold">
                  {messagingLoading ? 'Loading...' : 'Contact'}
                </Text>
              </TouchableOpacity>
            </View>
            {product.seller.bio && (
              <Text className="text-gray-600 text-sm mt-3 leading-5">{product.seller.bio}</Text>
            )}
          </View>

          {/* Pickup Location Map */}
          {product.pickup_location && (
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-900 mb-3">Pickup Location</Text>
              <View className="rounded-xl overflow-hidden border border-gray-200">
                <MapView
                  style={{ width: '100%', height: 200 }}
                  initialRegion={{
                    latitude: product.seller.location_lat || 37.78825,
                    longitude: product.seller.location_long || -122.4324,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
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
              <View className="flex-row items-start mt-3 p-3 bg-gray-50 rounded-lg">
                <Ionicons name="location" size={20} color="#6B7280" />
                <Text className="flex-1 text-gray-700 text-sm ml-2">{product.pickup_location}</Text>
                <TouchableOpacity onPress={openMaps}>
                  <Ionicons name="navigate" size={20} color="#22C55E" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-900 mb-3">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <View key={index} className="bg-gray-100 px-3 py-2 rounded-full">
                    <Text className="text-gray-700 text-sm">#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats */}
          <View className="flex-row items-center justify-around py-4 border-t border-gray-200">
            <View className="items-center">
              <View className="flex-row items-center">
                <Ionicons name="eye-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-bold ml-1">{product.view_count}</Text>
              </View>
              <Text className="text-gray-500 text-xs mt-1">Views</Text>
            </View>
            <View className="items-center">
              <View className="flex-row items-center">
                <Ionicons name="heart-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-bold ml-1">{product.favorite_count}</Text>
              </View>
              <Text className="text-gray-500 text-xs mt-1">Favorites</Text>
            </View>
            <View className="items-center">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-bold ml-1">
                  {new Date(product.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mt-1">Posted</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="border-t border-gray-200 px-4 py-3 bg-white">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl">
            <Ionicons name="heart-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-primary py-4 rounded-xl items-center">
            <Text className="text-white font-bold text-lg">Buy Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-100 p-3 rounded-xl"
            onPress={handleMessageSeller}
            disabled={messagingLoading}
          >
            {messagingLoading ? (
              <ActivityIndicator size="small" color="#1F2937" />
            ) : (
              <Ionicons name="chatbubble-outline" size={24} color="#1F2937" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
