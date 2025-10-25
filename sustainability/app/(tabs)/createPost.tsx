import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductInsert } from '@/types';

interface PostData {
  title: string;
  description: string;
  price: string;
  unit: string;
  category: string;
  location: string;
  images: string[];
  tags: string[];
  availableQuantity: string;
  latitude?: number;
  longitude?: number;
  isResidential: boolean;
  pickupPoint: string;
  pickupInstructions: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
}

const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy & Eggs', 'Herbs', 'Grains', 'Other'];
const UNITS = ['lb', 'kg', 'dozen', 'bunch', 'piece', 'bag', 'box'];
const POPULAR_TAGS = ['Fresh', 'Local', 'Seasonal', 'Farm-to-table', 'Sustainable', 'Hand-picked'];

export default function CreatePostScreen() {
  const router = useRouter();
  const { addProduct } = useMarketplace();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('');
  const [postData, setPostData] = useState<PostData>({
    title: '',
    description: '',
    price: '',
    unit: 'lb',
    category: 'Vegetables',
    location: '',
    images: [],
    tags: [],
    availableQuantity: '',
    latitude: undefined,
    longitude: undefined,
    isResidential: true,
    pickupPoint: '',
    pickupInstructions: '',
    pickupLatitude: undefined,
    pickupLongitude: undefined,
  });

  const updatePostData = (field: keyof PostData, value: any) => {
    setPostData(prev => ({ ...prev, [field]: value }));
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to set your location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      updatePostData('latitude', location.coords.latitude);
      updatePostData('longitude', location.coords.longitude);
      
      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address.length > 0) {
        const addr = address[0];
        const fullAddress = `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();
        updatePostData('location', fullAddress);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updatePostData('images', [...postData.images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = postData.images.filter((_, i) => i !== index);
    updatePostData('images', newImages);
  };

  const toggleTag = (tag: string) => {
    const newTags = postData.tags.includes(tag)
      ? postData.tags.filter(t => t !== tag)
      : [...postData.tags, tag];
    updatePostData('tags', newTags);
  };

  const togglePaymentMethod = (method: string) => {
    const newMethods = selectedPaymentMethods.includes(method)
      ? selectedPaymentMethods.filter(m => m !== method)
      : [...selectedPaymentMethods, method];
    setSelectedPaymentMethods(newMethods);
  };

  const nextStep = () => {
    // Validate current step before advancing
    if (currentStep === 1) {
      if (!postData.title.trim() || !postData.description.trim()) {
        Alert.alert('Required Fields', 'Please fill in both title and description');
        return;
      }
    } else if (currentStep === 2) {
      if (!postData.price.trim()) {
        Alert.alert('Required Fields', 'Please enter a price');
        return;
      }
    } else if (currentStep === 3) {
      if (!postData.location.trim()) {
        Alert.alert('Required Fields', 'Please enter a location');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!postData.title || !postData.description || !postData.price || !postData.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Add the product to marketplace (now saves to Supabase)
      const productData: Omit<ProductInsert, 'seller_id'> = {
        title: postData.title,
        description: postData.description,
        price: parseFloat(postData.price),
        quantity_available: parseInt(postData.availableQuantity) || 1,
        unit_of_measure: postData.unit as any,
        category: postData.category.toLowerCase() as any,
        tags: postData.tags,
        is_organic: false,
        growing_method: 'conventional',
        status: 'active',
        available_from: new Date().toISOString(),
        available_to: null,
        pickup_location: postData.location,
        delivery_options: ['pickup'],
        images: postData.images,
        // Add the new fields
        payment_methods: selectedPaymentMethods,
        other_payment_method: otherPaymentMethod,
        pickup_instructions: postData.pickupInstructions,
        pickup_latitude: postData.pickupLatitude || null,
        pickup_longitude: postData.pickupLongitude || null,
        is_residential: postData.isResidential,
        latitude: postData.latitude || null,
        longitude: postData.longitude || null,
      };

      await addProduct(productData);

      // Reset form for new post
      setPostData({
        title: '',
        description: '',
        price: '',
        unit: 'lb',
        category: 'Vegetables',
        location: '',
        images: [],
        tags: [],
        availableQuantity: '',
        latitude: undefined,
        longitude: undefined,
        isResidential: true,
        pickupPoint: '',
        pickupInstructions: '',
        pickupLatitude: undefined,
        pickupLongitude: undefined,
      });
      setCurrentStep(1);

      // Navigate to marketplace
      router.push('/(tabs)/marketplace');
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to create post: ${errorMessage}`);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center mb-6">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <View
            className={`w-8 h-8 rounded-full items-center justify-center ${
              step <= currentStep ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                step <= currentStep ? 'text-white' : 'text-gray-500'
              }`}
            >
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View
              className={`h-1 w-8 mx-2 ${
                step < currentStep ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <View className="items-center mb-6">
        <Text className="text-3xl font-bold text-gray-900 mb-2">What are you selling?</Text>
        <Text className="text-base text-gray-600 text-center px-4">
          Tell us about your product and add some photos
        </Text>
      </View>
      
      {/* Product Title */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Product Title *</Text>
        <TextInput
          className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg"
          placeholder="e.g., Fresh Organic Tomatoes"
          placeholderTextColor="#9CA3AF"
          value={postData.title}
          onChangeText={(text) => updatePostData('title', text)}
        />
      </View>

      {/* Description */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Description *</Text>
        <TextInput
          className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg h-32"
          placeholder="Describe your product, growing methods, freshness, etc."
          placeholderTextColor="#9CA3AF"
          value={postData.description}
          onChangeText={(text) => updatePostData('description', text)}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Category Selection */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => updatePostData('category', category)}
              className={`px-6 py-3 rounded-full border-2 ${
                postData.category === category 
                  ? 'bg-primary border-primary' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`font-semibold text-base ${
                  postData.category === category ? 'text-white' : 'text-gray-700'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Photo Upload Section */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Add Photos</Text>
        <View className="bg-white border-2 border-gray-200 rounded-2xl p-4">
          <View className="flex-row flex-wrap gap-4">
            {postData.images.map((image, index) => (
              <View key={index} className="relative">
                <Image source={{ uri: image }} className="w-24 h-24 rounded-xl" />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {postData.images.length < 5 && (
              <TouchableOpacity
                onPress={pickImage}
                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center"
              >
                <Ionicons name="camera" size={28} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 mt-1">Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-sm text-gray-500 mt-3 text-center">
            Add up to 5 photos to showcase your product
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1">
      <TouchableOpacity 
        className="flex-1" 
        activeOpacity={1}
        onPress={() => setShowUnitDropdown(false)}
      >
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Set Your Price</Text>
          <Text className="text-base text-gray-600 text-center px-4">
            Set competitive pricing and payment options for your product
          </Text>
        </View>
      
        {/* Price and Unit Section */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Price *</Text>
              <TextInput
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-5 py-4 text-lg"
                placeholder="0.00"
                value={postData.price}
                onChangeText={(text) => updatePostData('price', text)}
                keyboardType="numeric"
              />
            </View>
            <View className="w-28">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Unit</Text>
              <TouchableOpacity
                onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
              >
                <Text className="text-lg font-semibold text-gray-700">{postData.unit}</Text>
                <Ionicons 
                  name={showUnitDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Available Quantity */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Available Quantity</Text>
          <TextInput
            className="bg-gray-50 border-2 border-gray-200 rounded-xl px-5 py-4 text-lg"
            placeholder="e.g., 50 lbs available"
            value={postData.availableQuantity}
            onChangeText={(text) => updatePostData('availableQuantity', text)}
          />
        </View>

        {/* Payment Methods */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Accepted Payment Methods</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Cash App', 'In-App', 'Other'].map((method) => (
              <TouchableOpacity
                key={method}
                onPress={() => togglePaymentMethod(method)}
                className={`px-3 py-2 rounded-full border ${
                  selectedPaymentMethods.includes(method)
                    ? 'bg-primary border-primary'
                    : 'bg-gray-100 border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selectedPaymentMethods.includes(method)
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-sm text-gray-500 mt-3">
            Select all payment methods you accept from buyers
          </Text>
          
          {/* Other Payment Method Text Field */}
          {selectedPaymentMethods.includes('Other') && (
            <View className="mt-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Specify Other Payment Method</Text>
              <TextInput
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
                placeholder="e.g., Apple Pay, Google Pay, Check..."
                value={otherPaymentMethod}
                onChangeText={setOtherPaymentMethod}
              />
            </View>
          )}
        </View>

        {/* Tags */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Tags</Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                className={`px-3 py-2 rounded-full ${
                  postData.tags.includes(tag) ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    postData.tags.includes(tag) ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Unit Dropdown Overlay */}
      {showUnitDropdown && (
        <View className="absolute inset-0 z-[9999]" style={{zIndex: 9999}}>
          <TouchableOpacity 
            className="flex-1 bg-black/30" 
            onPress={() => setShowUnitDropdown(false)}
            activeOpacity={1}
          />
          <View className="absolute top-32 right-4 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <View className="bg-gray-50 p-2 border-b border-gray-100">
              <Text className="text-xs font-semibold text-gray-500 text-center">Select Unit</Text>
            </View>
            {UNITS.map((unit, index) => (
              <TouchableOpacity
                key={unit}
                onPress={() => {
                  updatePostData('unit', unit);
                  setShowUnitDropdown(false);
                }}
                className={`px-4 py-4 ${
                  postData.unit === unit 
                    ? 'bg-primary' 
                    : 'bg-white'
                } ${index !== UNITS.length - 1 ? 'border-b border-gray-100' : ''}`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-base font-semibold ${
                      postData.unit === unit ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {unit}
                  </Text>
                  {postData.unit === unit && (
                    <Ionicons name="checkmark" size={18} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <View className="items-center mb-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Set Location & Pickup</Text>
        <Text className="text-base text-gray-600 text-center px-4">
          Where can buyers pick up your product?
        </Text>
      </View>
      
      {/* Location Input */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Location *</Text>
        <TextInput
          className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg"
          placeholder="e.g., Austin, TX or 123 Main St, Austin, TX"
          placeholderTextColor="#9CA3AF"
          value={postData.location}
          onChangeText={(text) => updatePostData('location', text)}
        />
      </View>

      {/* Current Location Button */}
      <TouchableOpacity
        onPress={getCurrentLocation}
        className="flex-row items-center justify-center py-3 px-4 bg-primary rounded-xl mb-4"
      >
        <Ionicons name="location" size={18} color="white" />
        <Text className="text-white font-semibold ml-2">Use Current Location</Text>
      </TouchableOpacity>

      {/* Location Info */}
      {postData.latitude && postData.longitude && (
        <View className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            <Text className="text-base font-semibold text-blue-800 ml-2">Location Set</Text>
          </View>
          <Text className="text-sm text-blue-700 mb-1">
            Coordinates: {postData.latitude.toFixed(4)}, {postData.longitude.toFixed(4)}
          </Text>
          <Text className="text-sm text-blue-700">
            Address: {postData.location}
          </Text>
        </View>
      )}

      {/* Google Maps with Pickup Spot */}
      {postData.latitude && postData.longitude && (
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Set Pickup Spot</Text>
          <View className="h-64 rounded-xl overflow-hidden border-2 border-gray-200">
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: postData.latitude,
                longitude: postData.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                updatePostData('pickupLatitude', latitude);
                updatePostData('pickupLongitude', longitude);
              }}
            >
              {/* Main location marker */}
              <Marker
                coordinate={{
                  latitude: postData.latitude,
                  longitude: postData.longitude,
                }}
                title="Your Location"
                pinColor="blue"
              />
              
              {/* Pickup spot marker */}
              {postData.pickupLatitude && postData.pickupLongitude && (
                <Marker
                  coordinate={{
                    latitude: postData.pickupLatitude,
                    longitude: postData.pickupLongitude,
                  }}
                  title="Pickup Spot"
                  pinColor="green"
                  draggable
                  onDragEnd={(event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    updatePostData('pickupLatitude', latitude);
                    updatePostData('pickupLongitude', longitude);
                  }}
                />
              )}
            </MapView>
          </View>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Tap on the map to set pickup spot, then drag the green marker to adjust
          </Text>
        </View>
      )}

      {/* Pickup Instructions */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Pickup Instructions</Text>
        <TextInput
          className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg h-24"
          placeholder="e.g., Ring doorbell, call when you arrive, leave in cooler by door..."
          placeholderTextColor="#9CA3AF"
          value={postData.pickupInstructions}
          onChangeText={(text) => updatePostData('pickupInstructions', text)}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Address Type */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Address Type</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => updatePostData('isResidential', true)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 ${
              postData.isResidential ? 'bg-primary border-primary' : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-center font-semibold text-base ${
                postData.isResidential ? 'text-white' : 'text-gray-700'
              }`}
            >
              Residential
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updatePostData('isResidential', false)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 ${
              !postData.isResidential ? 'bg-primary border-primary' : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-center font-semibold text-base ${
                !postData.isResidential ? 'text-white' : 'text-gray-700'
              }`}
            >
              Commercial
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View className="flex-1">
      {/* Full Screen Post Summary */}
      <View className="flex-1 bg-green-50 rounded-3xl p-6 mx-2">
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-green-800">Post Summary</Text>
        </View>
        
        {/* Main Product Info */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">{postData.title}</Text>
          <Text className="text-2xl font-bold text-primary mb-4 text-center">
            ${postData.price}<Text className="text-lg text-gray-500 font-normal">/{postData.unit}</Text>
          </Text>
          <Text className="text-lg text-gray-700 leading-6 text-center">{postData.description}</Text>
        </View>

        {/* Category */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="pricetag" size={24} color="#22C55E" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Category</Text>
          </View>
          <Text className="text-lg text-gray-700 text-center">{postData.category}</Text>
        </View>

        {/* Location */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="location" size={24} color="#22C55E" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Location</Text>
          </View>
          <Text className="text-lg text-gray-700 text-center">{postData.location || 'Not set'}</Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            {postData.isResidential ? 'Residential Address' : 'Commercial Address'}
          </Text>
        </View>

        {/* Available Quantity */}
        {postData.availableQuantity && (
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="basket" size={24} color="#22C55E" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Available Quantity</Text>
            </View>
            <Text className="text-lg text-gray-700 text-center">{postData.availableQuantity} {postData.unit}</Text>
          </View>
        )}

        {/* Payment Methods */}
        {selectedPaymentMethods.length > 0 && (
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="card" size={24} color="#22C55E" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Payment Methods</Text>
            </View>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {selectedPaymentMethods.map((method) => (
                <View key={method} className="bg-green-100 px-3 py-2 rounded-full">
                  <Text className="text-sm font-semibold text-green-700">{method}</Text>
                </View>
              ))}
              {selectedPaymentMethods.includes('Other') && otherPaymentMethod && (
                <View className="bg-green-100 px-3 py-2 rounded-full">
                  <Text className="text-sm font-semibold text-green-700">{otherPaymentMethod}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Photo Preview */}
        {postData.images.length > 0 && (
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="camera" size={24} color="#22C55E" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Photos ({postData.images.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
              {postData.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} className="w-24 h-24 rounded-xl" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tags Preview */}
        {postData.tags.length > 0 && (
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="pricetag" size={24} color="#22C55E" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Tags ({postData.tags.length})</Text>
            </View>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {postData.tags.map((tag) => (
                <View key={tag} className="bg-primary px-3 py-2 rounded-full">
                  <Text className="text-sm font-semibold text-white">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Create Post</Text>
          <View className="w-6" />
        </View>
        {renderStepIndicator()}
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 pt-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Navigation */}
      <View className="bg-white px-4 py-4 border-t border-gray-100">
        <View className="flex-row gap-3">
          {currentStep > 1 && (
            <TouchableOpacity
              onPress={prevStep}
              className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
            >
              <Text className="text-base font-semibold text-gray-700">Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 4 ? (
            <TouchableOpacity
              onPress={nextStep}
              className="flex-1 bg-primary rounded-xl py-4 items-center"
            >
              <Text className="text-base font-semibold text-white">Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              className="flex-1 bg-primary rounded-xl py-4 items-center"
            >
              <Text className="text-base font-semibold text-white">Post to Marketplace</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
