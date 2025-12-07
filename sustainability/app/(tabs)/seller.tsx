import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { supabase } from '@/lib/supabase';
import GeminiWrapper from '@/components/GeminiWrapper';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_ENDPOINT = process.env.EXPO_PUBLIC_GEMINI_ENDPOINT || '';

export default function SellerScreen() {
  const { user } = useAuth();
  const { products, loadProducts } = useMarketplace();
  const [activeTab, setActiveTab] = useState<'products' | 'assistant'>('products');

  
  // Filter to only show products created by the current user
  const myProducts = products.filter(product => product.seller_id === user?.id);

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

              if (error) {
                Alert.alert('Error', 'Failed to delete product');
                return;
              }

              // Reload products
              if (loadProducts) {
                await loadProducts();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderProductCard = ({ item }: { item: typeof products[0] }) => (
    <View className="bg-background-light rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row">
        {/* Product Image */}
        <View className="w-20 h-20 rounded-xl bg-background-light mr-3">
          {item.images && item.images.length > 0 && item.images[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              className="w-full h-full rounded-xl"
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
              {item.title || 'Untitled Product'}
            </Text>
            <View className={`px-2 py-1 rounded-full ml-2 ${
              (item.quantity_available || 0) < 10 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Text className={`text-xs font-semibold ${
                (item.quantity_available || 0) < 10 ? 'text-orange-700' : 'text-green-700'
              }`}>
                {item.quantity_available || 0} in stock
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-primary">
              ${(item.price || 0).toFixed(2)}
              <Text className="text-sm text-gray-500 font-normal">/{item.unit_of_measure || 'unit'}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteProduct(item.id)}
              className="ml-2"
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 mb-2">My Selling</Text>
        <Text className="text-sm text-gray-600">Manage your products and track your sales</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-background-light border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => setActiveTab('products')}
          className={`flex-1 py-3 ${activeTab === 'products' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={`text-center font-semibold ${activeTab === 'products' ? 'text-primary' : 'text-gray-600'}`}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('assistant')}
          className={`flex-1 py-3 ${activeTab === 'assistant' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={`text-center font-semibold ${activeTab === 'assistant' ? 'text-primary' : 'text-gray-600'}`}>
            AI Assistant
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'products' ? (
        <>
          {/* Stats Section */}
          <View className="bg-background-light mx-4 mt-4 rounded-2xl p-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-900 mb-3">Stats</Text>
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-primary">{myProducts.length}</Text>
                <Text className="text-sm text-gray-600">Active Products</Text>
              </View>
              <View className="flex-1 items-center border-l border-gray-200">
                <Text className="text-2xl font-bold text-green-600">$0</Text>
                <Text className="text-sm text-gray-600">Total Sales</Text>
              </View>
              <View className="flex-1 items-center border-l border-gray-200">
                <Text className="text-2xl font-bold text-blue-600">{myProducts.reduce((sum, p) => sum + (p.quantity_available || 0), 0)}</Text>
                <Text className="text-sm text-gray-600">Total Stock</Text>
              </View>
            </View>
          </View>
          {/* Products List */}
          <View className="flex-1 px-4 pt-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">My Products</Text>
            
            {myProducts.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-semibold text-gray-400 mt-4">No products yet</Text>
                <Text className="text-sm text-gray-400 mt-1">Start selling by creating a new product</Text>
              </View>
            ) : (
              <FlatList
                data={myProducts}
                renderItem={renderProductCard}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </>
      ) : (
        <View className="flex-1 bg-background-light">
          <GeminiWrapper endpoint={GEMINI_ENDPOINT} apiKey={GEMINI_API_KEY} />
        </View>
      )}
    </SafeAreaView>
  );
}

