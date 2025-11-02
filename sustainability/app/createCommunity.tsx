import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Farming',
  'Marketplace',
  'Organic',
  'Sustainability',
  'Gardening',
  'Cooking',
  'Education',
  'Other',
];

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCommunity } = useCommunity();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (localUri: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExtension = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
      const filePath = `community-images/${fileName}`;

      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localUri);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Failed to load file: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Failed to load file'));
        xhr.send();
      });

      const fileArray = new Uint8Array(fileData);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, fileArray, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a community name');
      return;
    }

    if (name.trim().length < 3) {
      Alert.alert('Invalid', 'Community name must be at least 3 characters');
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        try {
          finalImageUrl = await uploadImage(selectedImage);
          setImageUrl(finalImageUrl);
        } catch (error: any) {
          Alert.alert('Image Upload Error', error.message || 'Failed to upload image. Proceeding without image...');
        }
      }

      await createCommunity({
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        image_url: finalImageUrl,
      });

      Alert.alert('Success', 'Community created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating community:', error);
      Alert.alert('Error', error.message || 'Failed to create community');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="w-24">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center absolute left-0 right-0">
            <Text className="text-xl font-bold text-gray-900">Create Community</Text>
          </View>
          <View className="w-24 items-end">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !name.trim()}
              className={`px-4 py-2 rounded-xl flex-row items-center ${
                submitting || !name.trim()
                  ? 'bg-gray-300'
                  : 'bg-primary'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Create</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Community Image */}
        <View className="mb-6 items-center">
          <TouchableOpacity
            onPress={pickImage}
            className="w-32 h-32 rounded-2xl bg-gray-100 items-center justify-center border-2 border-dashed border-gray-300"
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <>
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                <Text className="text-sm text-gray-500 mt-2">Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
          {selectedImage && (
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(null);
                setImageUrl(null);
              }}
              className="mt-2"
            >
              <Text className="text-sm text-primary">Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Community Name */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Community Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Austin Urban Farm"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
          />
          <Text className="text-xs text-gray-500 mt-1">{name.length}/50</Text>
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people what this community is about..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[100]"
          />
          <Text className="text-xs text-gray-500 mt-1">{description.length}/500</Text>
        </View>

        {/* Category */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(category === cat ? '' : cat)}
                className={`mr-2 px-4 py-2 rounded-full border ${
                  category === cat
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    category === cat ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

