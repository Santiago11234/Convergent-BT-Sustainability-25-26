import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ProductCategory } from '@/types';
import { useProducts } from '@/hooks/useProducts';


const CATEGORIES: ('All' | ProductCategory)[] = ['All', 'vegetables', 'fruits', 'eggs', 'herbs', 'dairy', 'other'];

// Helper to capitalize category names
const formatCategoryName = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export default function MarketplaceScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50]);
  const [distanceRange, setDistanceRange] = useState(10);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price-low' | 'price-high' | 'stock'>('distance');

  // Fetch products from Supabase with filtering
  const { products, loading, error } = useProducts({
    category: selectedCategory,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    maxDistance: distanceRange,
    searchQuery: searchQuery.trim(),
  });

  // Client-side sorting
  const sortedProducts = useMemo(() => {
    const productsCopy = [...products];

    switch (sortBy) {
      case 'distance':
        return productsCopy.sort((a, b) => a.distance - b.distance);
      case 'price-low':
        return productsCopy.sort((a, b) => a.price - b.price);
      case 'price-high':
        return productsCopy.sort((a, b) => b.price - a.price);
      case 'stock':
        return productsCopy.sort((a, b) => b.quantity_available - a.quantity_available);
      default:
        return productsCopy;
    }
  }, [products, sortBy]);

  const renderListingCard = ({ item }: { item: typeof products[0] }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200/50"
      activeOpacity={0.7}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View className="flex-row">
        {/* Product Image */}
        <View className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden mr-3">
          {item.images && item.images.length > 0 && item.images[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-green-50">
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
              {item.title}
            </Text>
            <View className={`px-2 py-1 rounded-full ml-2 ${
              item.quantity_available < 10 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Text className={`text-xs font-semibold ${
                item.quantity_available < 10 ? 'text-orange-700' : 'text-green-700'
              }`}>
                {item.quantity_available} in stock
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-2">
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-1">{item.seller.name}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-1">{item.distance.toFixed(1)} miles away</Text>
            </View>
            <Text className="text-xl font-bold text-primary">
              ${item.price.toFixed(2)}
              <Text className="text-sm text-gray-500 font-normal">/{item.unit_of_measure}</Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 mb-4">Marketplace</Text>

        {/* Search Bar */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-900"
              placeholder="Search products or sellers..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl ${showFilters ? 'bg-primary' : 'bg-gray-100'}`}
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
              className={`px-4 py-2 mr-3 rounded-full ${
                selectedCategory === category
                  ? 'bg-primary'
                  : 'bg-gray-100'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-semibold ${
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
        <View className="bg-white px-4 py-4 border-b border-gray-100">
          {/* Distance Filter */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-900">Distance Range</Text>
              <Text className="text-sm text-primary font-bold">≤ {distanceRange} miles</Text>
            </View>
            <View className="flex-row gap-3">
              {[5, 10, 25, 50].map(distance => (
                <TouchableOpacity
                  key={distance}
                  onPress={() => setDistanceRange(distance)}
                  className={`flex-1 py-2 rounded-lg ${
                    distanceRange === distance ? 'bg-primary' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      distanceRange === distance ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {distance}mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range Filter */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-900">Price Range</Text>
              <Text className="text-sm text-primary font-bold">
                ${priceRange[0]} - ${priceRange[1]}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPriceRange([0, 10])}
                className={`flex-1 py-2 rounded-lg ${
                  priceRange[1] === 10 ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    priceRange[1] === 10 ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  $0-10
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPriceRange([0, 25])}
                className={`flex-1 py-2 rounded-lg ${
                  priceRange[1] === 25 ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    priceRange[1] === 25 ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  $0-25
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPriceRange([0, 50])}
                className={`flex-1 py-2 rounded-lg ${
                  priceRange[1] === 50 ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    priceRange[1] === 50 ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Listings */}
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-600">
            {sortedProducts.length} {sortedProducts.length === 1 ? 'listing' : 'listings'} found
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setShowSortModal(true)}
          >
            <Text className="text-sm font-semibold text-gray-600 mr-1">Sort by</Text>
            <Ionicons name="swap-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#22C55E" />
            <Text className="text-gray-600 mt-4">Loading products...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View className="items-center justify-center py-20">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text className="text-lg font-semibold text-gray-900 mt-4">Error loading products</Text>
            <Text className="text-sm text-gray-600 mt-1">{error}</Text>
          </View>
        )}

        {/* Products List */}
        {!loading && !error && (
          <FlatList
            data={sortedProducts}
            renderItem={renderListingCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-semibold text-gray-400 mt-4">No listings found</Text>
                <Text className="text-sm text-gray-400 mt-1">Try adjusting your filters</Text>
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
            <View className="bg-white rounded-t-3xl px-6 py-6">
              <Text className="text-xl font-bold text-gray-900 mb-4">Sort By</Text>

              <TouchableOpacity
                onPress={() => {
                  setSortBy('distance');
                  setShowSortModal(false);
                }}
                className={`flex-row items-center justify-between py-4 px-4 rounded-xl mb-2 ${
                  sortBy === 'distance' ? 'bg-green-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="location"
                    size={20}
                    color={sortBy === 'distance' ? '#22C55E' : '#6B7280'}
                  />
                  <Text className={`ml-3 font-semibold ${
                    sortBy === 'distance' ? 'text-primary' : 'text-gray-700'
                  }`}>
                    Nearest First
                  </Text>
                </View>
                {sortBy === 'distance' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSortBy('price-low');
                  setShowSortModal(false);
                }}
                className={`flex-row items-center justify-between py-4 px-4 rounded-xl mb-2 ${
                  sortBy === 'price-low' ? 'bg-green-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={sortBy === 'price-low' ? '#22C55E' : '#6B7280'}
                  />
                  <Text className={`ml-3 font-semibold ${
                    sortBy === 'price-low' ? 'text-primary' : 'text-gray-700'
                  }`}>
                    Price: Low to High
                  </Text>
                </View>
                {sortBy === 'price-low' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSortBy('price-high');
                  setShowSortModal(false);
                }}
                className={`flex-row items-center justify-between py-4 px-4 rounded-xl mb-2 ${
                  sortBy === 'price-high' ? 'bg-green-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={sortBy === 'price-high' ? '#22C55E' : '#6B7280'}
                  />
                  <Text className={`ml-3 font-semibold ${
                    sortBy === 'price-high' ? 'text-primary' : 'text-gray-700'
                  }`}>
                    Price: High to Low
                  </Text>
                </View>
                {sortBy === 'price-high' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSortBy('stock');
                  setShowSortModal(false);
                }}
                className={`flex-row items-center justify-between py-4 px-4 rounded-xl ${
                  sortBy === 'stock' ? 'bg-green-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="cube"
                    size={20}
                    color={sortBy === 'stock' ? '#22C55E' : '#6B7280'}
                  />
                  <Text className={`ml-3 font-semibold ${
                    sortBy === 'stock' ? 'text-primary' : 'text-gray-700'
                  }`}>
                    Most in Stock
                  </Text>
                </View>
                {sortBy === 'stock' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
