import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Image, Modal, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ProductCategory } from '@/types';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES: ('All' | ProductCategory)[] = ['All', 'vegetables', 'fruits', 'eggs', 'herbs', 'dairy', 'other'];

const formatCategoryName = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export default function MarketplaceScreen() {
  const router = useRouter();
  const { products, loading } = useMarketplace();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50]);
  const [distanceRange, setDistanceRange] = useState(10);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price-low' | 'price-high' | 'stock'>('distance');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = products.filter(product => product.seller_id !== user?.id);

    if (selectedCategory !== 'All') {
      filteredProducts = filteredProducts.filter(product => 
        product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    filteredProducts = filteredProducts.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.title?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        (product.tags && product.tags.some(tag => tag?.toLowerCase().includes(query)))
      );
    }

    switch (sortBy) {
      case 'distance':
        return filteredProducts.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      case 'price-low':
        return filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high':
        return filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'stock':
        return filteredProducts.sort((a, b) => (b.quantity_available || 0) - (a.quantity_available || 0));
      default:
        return filteredProducts;
    }
  }, [products, user, selectedCategory, priceRange, searchQuery, sortBy]);

  const handleSellerPress = (sellerId?: string | null) => {
    if (!sellerId) return;
    if (sellerId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${sellerId}`);
    }
  };

  // Separate component for listing card to use hooks properly
  const ListingCard = ({ item, index, fadeAnim }: { item: typeof products[0]; index: number; fadeAnim: Animated.Value }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current; // Start at 1 (no scale)
    const hasAnimated = React.useRef(false);

    React.useEffect(() => {
      if (!hasAnimated.current) {
        scaleAnim.setValue(0.95);
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
          delay: index * 30,
        }).start();
        hasAnimated.current = true;
      }
    }, []);

    // Render star rating
    const renderStars = () => {
      const rating = 4.5; // You can make this dynamic based on item.rating
      return (
        <View className="flex-row items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.floor(rating) ? "star" : star === Math.ceil(rating) ? "star-half" : "star-outline"}
              size={16}
              color="#F59E0B"
            />
          ))}
        </View>
      );
    };

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          className="bg-[#F5F1E8] rounded-2xl mb-3 mx-4 shadow-sm flex-row overflow-hidden"
          activeOpacity={0.9}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          {/* Product Image - Left Side */}
          <View className="w-32 h-32 bg-background-light relative">
            {item.images && item.images.length > 0 && item.images[0] ? (
              <Image
                source={{ uri: item.images[0] }}
                className="w-full h-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gray-200 rounded-2xl">
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Product Details - Right Side */}
          <View className="flex-1 p-4 justify-between">
            {/* Top Section */}
            <View>
              <View className="flex-row items-start justify-between mb-1">
                <Text className="text-lg font-bold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                  {item.title || 'Untitled Product'}
                </Text>
                {/* Share Button */}
                <TouchableOpacity
                  className="p-1"
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    // Share functionality
                  }}
                >
                  <Ionicons name="share-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Price */}
              <Text className="text-base font-semibold text-gray-700 mb-2">
                ${(item.price || 0).toFixed(2)} - ${((item.price || 0) * 1.35).toFixed(2)}
              </Text>

              {/* Seller */}
              <TouchableOpacity
                className="flex-row items-center mb-2"
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSellerPress(item.seller?.id);
                }}
              >
                <Text className="text-sm text-gray-600">By {item.seller?.name || 'Unknown Seller'}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#8FAA7C" className="ml-1" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Bottom Section */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  {Math.round((item.distance || 0) * 1.6)} min.
                </Text>
              </View>

              <View>
                <Text className="text-xs text-gray-600 mb-1">Rating</Text>
                {renderStars()}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderListingCard = ({ item, index }: { item: typeof products[0]; index: number }) => (
    <ListingCard item={item} index={index} fadeAnim={fadeAnim} />
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-3xl font-black text-primary flex-1">What can we help you find?</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/createProduct')}
            className="bg-primary px-3 py-2 rounded-xl ml-3"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1 flex-row items-center bg-background-light rounded-2xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Search products or sellers..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl ${showFilters ? 'bg-primary' : 'bg-background-light'}`}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options"
              size={24}
              color={showFilters ? '#FFFFFF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`px-4 py-2 mr-2 rounded-full ${
                selectedCategory === category
                  ? 'bg-primary'
                  : 'bg-background-light'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-semibold text-sm ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {formatCategoryName(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <Animated.View 
          className="bg-background px-6 py-4 border-b border-gray-100"
          style={{ opacity: fadeAnim }}
        >
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-gray-900">Distance Range</Text>
              <Text className="text-sm text-primary font-bold">≤ {distanceRange} miles</Text>
            </View>
            <View className="flex-row gap-3">
              {[5, 10, 25, 50].map(distance => (
                <TouchableOpacity
                  key={distance}
                  onPress={() => setDistanceRange(distance)}
                  className={`flex-1 py-2.5 rounded-xl ${
                    distanceRange === distance ? 'bg-primary' : 'bg-background-light'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-center font-semibold text-sm ${
                      distanceRange === distance ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {distance}mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-gray-900">Price Range</Text>
              <Text className="text-sm text-primary font-bold">
                ${priceRange[0]} - ${priceRange[1]}
              </Text>
            </View>
            <View className="flex-row gap-3">
              {[10, 25, 50].map(maxPrice => (
                <TouchableOpacity
                  key={maxPrice}
                  onPress={() => setPriceRange([0, maxPrice])}
                  className={`flex-1 py-2.5 rounded-xl ${
                    priceRange[1] === maxPrice ? 'bg-primary' : 'bg-background-light'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-center font-semibold text-sm ${
                      priceRange[1] === maxPrice ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    ${maxPrice === 50 ? 'All' : `0-${maxPrice}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Listings */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-sm font-bold text-gray-600">
            {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'listing' : 'listings'}
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-bold text-gray-600 mr-1">Sort by</Text>
            <Ionicons name="swap-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8FAA7C" />
            <Text className="text-gray-600 mt-4">Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedProducts}
            renderItem={renderListingCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-20 px-6">
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-bold text-gray-400 mt-4">No listings found</Text>
                <Text className="text-sm text-gray-400 mt-2 text-center">Try adjusting your filters</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-background rounded-t-3xl px-6 py-6">
              <Text className="text-xl font-bold text-gray-900 mb-4">Sort By</Text>

              {[
                { value: 'distance', label: 'Nearest First', icon: 'location' },
                { value: 'price-low', label: 'Price: Low to High', icon: 'arrow-down' },
                { value: 'price-high', label: 'Price: High to Low', icon: 'arrow-up' },
                { value: 'stock', label: 'Most in Stock', icon: 'cube' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setSortBy(option.value as any);
                    setShowSortModal(false);
                  }}
                  className={`flex-row items-center justify-between py-4 px-4 rounded-2xl mb-2 ${
                    sortBy === option.value ? 'bg-primary/10' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={sortBy === option.value ? '#8FAA7C' : '#6B7280'}
                    />
                    <Text className={`ml-3 font-semibold ${
                      sortBy === option.value ? 'text-primary' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </Text>
                  </View>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#8FAA7C" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
