import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface MessageInputProps {
  onSend: (text: string, images?: string[]) => Promise<boolean>;
  sending: boolean;
}

export function MessageInput({ onSend, sending }: MessageInputProps) {
  const [text, setText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need permission to access your photos to send images.');
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...imageUris].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!text.trim() && selectedImages.length === 0) || sending) return;

    const success = await onSend(text.trim(), selectedImages.length > 0 ? selectedImages : undefined);
    if (success) {
      setText('');
      setSelectedImages([]);
    }
  };

  const hasContent = text.trim() || selectedImages.length > 0;

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4 pt-2 pb-2"
        >
          {selectedImages.map((uri, index) => (
            <View key={index} className="relative mr-2">
              <Image
                source={{ uri }}
                className="w-20 h-20 rounded-lg"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={sending || selectedImages.length >= 5}
          className="w-11 h-11 rounded-full items-center justify-center bg-gray-100 mr-2"
        >
          <Ionicons name="image-outline" size={22} color="#6B7280" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-2">
          <TextInput
            className="flex-1 text-base text-gray-900"
            placeholder={selectedImages.length > 0 ? "Add a caption..." : "Type a message..."}
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!sending}
            onSubmitEditing={handleSend}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!hasContent || sending}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            hasContent && !sending ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={hasContent ? '#FFFFFF' : '#9CA3AF'}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
