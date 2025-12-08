import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductWithSeller } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getOrCreateConversation } = useConversations();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [message, setMessage] = useState('Is this still available?');
  const [isFollowing, setIsFollowing] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    if (product) {
      // Initialize tags from product data
      const initialTags = [];
      if (product.growing_method) {
        initialTags.push(product.growing_method.charAt(0).toUpperCase() + product.growing_method.slice(1));
      }
      // Add a default location tag
      initialTags.push('Fremont');
      setTags(initialTags);
    }
  }, [product]);

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

  const navigateToSellerProfile = () => {
    if (!product?.seller?.id) return;
    if (user?.id === product.seller.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${product.seller.id}`);
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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await handleMessageSeller();
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.floor(rating) ? "star" : star === Math.ceil(rating) ? "star-half" : "star-outline"}
            size={14}
            color="#F59E0B"
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8FAA7C" />
        <Text className="mt-4" style={{ color: '#72522A' }}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-semibold mt-4" style={{ color: '#563D1F' }}>Error Loading Product</Text>
        <Text className="text-sm mt-2 text-center" style={{ color: '#72522A' }}>{error || 'Product not found'}</Text>
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
    <View className="flex-1 bg-[#F5F1E8]">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
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
                  style={{ width, height: 350 }}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View
                style={{ width, height: 350 }}
                className="bg-background-light items-center justify-center"
              >
                <Ionicons name="image-outline" size={64} color="#563D1F" />
              </View>
            )}
          </ScrollView>

          {/* Back Button */}
          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 py-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-2 bg-white/90 rounded-full"
              >
                <Ionicons name="arrow-back" size={24} color="#563D1F" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Image Indicator */}
          {product.images && product.images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {product.images.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentImageIndex ? 'w-6 bg-gray-800' : 'w-2 bg-gray-800/50'
                  }`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="px-5 py-4">
          {/* Title and Actions */}
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-xl font-bold flex-1 mr-2" style={{ color: '#563D1F' }}>
              {product.title}
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="bg-[#FFCBA4] px-3 py-1 rounded-md">
                <Text className="text-[#563D1F] font-semibold text-xs">3 days fresh</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="share-outline" size={22} color="#563D1F" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="bookmark-outline" size={22} color="#563D1F" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {tags.map((tag, index) => (
                <View key={index} className="bg-[#8B7355] px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-white text-sm font-medium mr-2">{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          <View className="mb-3">
            <Text className="text-sm font-medium" style={{ color: '#563D1F' }}>
              Nearby - 1 mi
            </Text>
            <Text className="text-sm mt-1" style={{ color: '#72522A' }}>
              {product.pickup_location || '123 Farmers Ridge Blvd'}
            </Text>
          </View>

          {/* Description */}
          {product.description && (
            <View className="mb-4">
              <Text className="text-base font-semibold mb-2" style={{ color: '#563D1F' }}>Description</Text>
              <Text className="leading-5" style={{ color: '#72522A' }}>{product.description}</Text>
            </View>
          )}

          {/* Seller Info */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-row items-center flex-1"
                activeOpacity={0.8}
                onPress={navigateToSellerProfile}
              >
                {product.seller.profile_pic_url ? (
                  <Image
                    source={{ uri: product.seller.profile_pic_url }}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
                    <Text className="text-white text-lg font-bold">
                      {product.seller.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-base font-semibold" style={{ color: '#563D1F' }}>
                    Sold by {product.seller.name}
                  </Text>
                  <Text className="text-sm mt-0.5" style={{ color: '#72522A' }}>
                    Austin, TX
                  </Text>
                  <View className="flex-row items-center mt-1">
                    {renderStars(product.seller.seller_rating || 4.5)}
                    <Text className="text-xs ml-1" style={{ color: '#72522A' }}>
                      ({product.seller.review_count || 238})
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-5 py-2 rounded-full ${isFollowing ? 'bg-gray-300' : 'bg-[#4A6B3C]'}`}
                onPress={toggleFollow}
              >
                <Text className="font-semibold" style={{ color: isFollowing ? '#72522A' : '#FFFFFF' }}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Send a Message */}
          <View className="mb-6">
            <Text className="text-sm font-semibold mb-2" style={{ color: '#563D1F' }}>Send a message</Text>
            <View className="bg-[#8FAA7C] rounded-2xl p-3 flex-row items-center">
              <TextInput
                className="flex-1 text-white text-sm px-2"
                placeholder="Is this still available?"
                placeholderTextColor="#FFFFFF99"
                value={message}
                onChangeText={setMessage}
              />
              <TouchableOpacity
                className="bg-[#4A6B3C] px-4 py-2 rounded-xl"
                onPress={handleSendMessage}
                disabled={messagingLoading}
              >
                <Text className="text-white font-semibold text-sm">
                  {messagingLoading ? '...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <SafeAreaView edges={['bottom']} className="bg-[#F5F1E8]">
        <View className="px-5 py-3 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: '#563D1F' }}>
            ${product.price.toFixed(2)}
          </Text>
          <TouchableOpacity
            className="bg-[#4A6B3C] px-8 py-3 rounded-full"
            onPress={() => router.push(`/checkout/${product.id}`)}
          >
            <Text className="text-white font-bold text-lg">Buy</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}









