import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock data for listings - replace with real data from your backend
const MOCK_LISTINGS = [
  {
    id: '1',
    title: 'Fresh Organic Tomatoes',
    seller: 'Green Valley Farm',
    price: 4.99,
    unit: 'lb',
    distance: 2.5,
    organic: true,
    category: 'Vegetables',
    image: '🍅',
    location: 'Austin, TX',
  },
  {
    id: '2',
    title: 'Farm Fresh Eggs',
    seller: 'Sunny Side Farm',
    price: 6.50,
    unit: 'dozen',
    distance: 1.2,
    organic: true,
    category: 'Dairy & Eggs',
    image: '🥚',
    location: 'Austin, TX',
  },
  {
    id: '3',
    title: 'Sweet Strawberries',
    seller: 'Berry Patch Gardens',
    price: 8.99,
    unit: 'lb',
    distance: 3.8,
    organic: false,
    category: 'Fruits',
    image: '🍓',
    location: 'Round Rock, TX',
  },
  {
    id: '4',
    title: 'Crisp Lettuce Mix',
    seller: 'Urban Greens',
    price: 3.99,
    unit: 'bunch',
    distance: 0.8,
    organic: true,
    category: 'Vegetables',
    image: '🥬',
    location: 'Austin, TX',
  },
];

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Dairy & Eggs', 'Herbs', 'Other'];

export default function MarketplaceScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50]);
  const [distanceRange, setDistanceRange] = useState(10);
  const [organicOnly, setOrganicOnly] = useState(false);

  // Filter listings based on search and filters
  const filteredListings = MOCK_LISTINGS.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.seller.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || listing.category === selectedCategory;
    const matchesPrice = listing.price >= priceRange[0] && listing.price <= priceRange[1];
    const matchesDistance = listing.distance <= distanceRange;
    const matchesOrganic = !organicOnly || listing.organic;

    return matchesSearch && matchesCategory && matchesPrice && matchesDistance && matchesOrganic;
  });

  const renderListingCard = ({ item }: { item: typeof MOCK_LISTINGS[0] }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm shadow-gray-200/50"
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Product Image/Icon */}
        <View className="w-20 h-20 rounded-xl bg-green-50 items-center justify-center mr-3">
          <Text className="text-4xl">{item.image}</Text>
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
              {item.title}
            </Text>
            {item.organic && (
              <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                <Text className="text-xs font-semibold text-green-700">Organic</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mb-2">
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-1">{item.seller}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-1">{item.distance} miles away</Text>
            </View>
            <Text className="text-xl font-bold text-primary">
              ${item.price}
              <Text className="text-sm text-gray-500 font-normal">/{item.unit}</Text>
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
              className={`px-4 py-2 rounded-full ${
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
                {category}
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
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-900">Distance Range</Text>
              <Text className="text-sm text-primary font-bold">≤ {distanceRange} miles</Text>
            </View>
            <View className="flex-row gap-2">
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
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-900">Price Range</Text>
              <Text className="text-sm text-primary font-bold">
                ${priceRange[0]} - ${priceRange[1]}
              </Text>
            </View>
            <View className="flex-row gap-2">
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

          {/* Organic Filter */}
          <TouchableOpacity
            onPress={() => setOrganicOnly(!organicOnly)}
            className="flex-row items-center justify-between py-3 px-4 bg-gray-50 rounded-xl"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View
                className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                  organicOnly ? 'bg-primary border-primary' : 'border-gray-300'
                }`}
              >
                {organicOnly && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text className="text-base font-semibold text-gray-900">Organic Only</Text>
            </View>
            <Ionicons name="leaf" size={20} color="#22C55E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Listings */}
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-600">
            {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
          </Text>
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-sm font-semibold text-gray-600 mr-1">Sort by</Text>
            <Ionicons name="swap-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredListings}
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
      </View>
    </SafeAreaView>
  );
}
