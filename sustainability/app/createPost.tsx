import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { PostType } from '@/types';

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createPost } = useFeed();
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState<'blog' | 'image' | 'video'>('blog');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setSelectedImages(result.assets.map(asset => asset.uri));
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUrl(result.assets[0].uri);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }

    if (postType === 'blog' && !content.trim()) {
      Alert.alert('Required', 'Please enter content');
      return;
    }

    if (postType === 'image' && selectedImages.length === 0) {
      Alert.alert('Required', 'Please select at least one image');
      return;
    }

    if (postType === 'video' && !videoUrl) {
      Alert.alert('Required', 'Please select a video');
      return;
    }

    setSubmitting(true);

    try {
      // Determine post type based on selected type
      let finalPostType: PostType = 'blog';
      
      if (postType === 'video' && videoUrl) {
        finalPostType = 'video';
      } else if (postType === 'image' && selectedImages.length > 0) {
        finalPostType = 'image';
      } else if (postType === 'blog') {
        finalPostType = 'blog';
      }

      await createPost({
        post_type: finalPostType,
        title: title.trim(),
        description: description.trim() || null,
        content_markdown: postType === 'blog' && content ? content : null,
        images: selectedImages.length > 0 ? selectedImages : [],
        video_url: postType === 'video' ? videoUrl : null,
        thumbnail_url: null,
        duration_seconds: null,
        tags: tags,
        is_featured: false,
      });

      Alert.alert('Success', 'Post created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
      setSelectedImages([]);
      setVideoUrl(null);
      setTags([]);
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <TouchableOpacity onPress={() => router.push('/(tabs)/feed')}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-gray-900">Create Post</Text>
          </View>
          <View className="flex-1 items-end">
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={submitting}
              className="bg-primary px-4 py-2 rounded-xl flex-row items-center"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Post</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4 bg-white">
        {/* Post Type Selector */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Post Type</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setPostType('blog')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                postType === 'blog' ? 'bg-primary border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`text-center font-semibold ${postType === 'blog' ? 'text-white' : 'text-gray-700'}`}>
                Blog
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPostType('image')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                postType === 'image' ? 'bg-primary border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`text-center font-semibold ${postType === 'image' ? 'text-white' : 'text-gray-700'}`}>
                Image
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPostType('video')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                postType === 'video' ? 'bg-primary border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`text-center font-semibold ${postType === 'video' ? 'text-white' : 'text-gray-700'}`}>
                Video
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Title *</Text>
          <TextInput
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
            placeholder="Enter post title..."
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Description</Text>
          <TextInput
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 h-24 text-base"
            placeholder="Brief description..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Content based on type */}
        {postType === 'blog' && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Content *</Text>
            <TextInput
              className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 h-48 text-base"
              placeholder="Write your blog post..."
              placeholderTextColor="#9CA3AF"
              value={content}
              onChangeText={setContent}
              multiline
            />
          </View>
        )}

        {postType === 'image' && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Images</Text>
            <TouchableOpacity
              onPress={pickImages}
              className="bg-primary rounded-xl py-4 items-center mb-3"
            >
              <Ionicons name="images" size={24} color="white" />
              <Text className="text-white font-semibold mt-2">Select Images</Text>
            </TouchableOpacity>
            
            {selectedImages.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {selectedImages.map((uri, index) => (
                  <View key={index} className="relative">
                    <Image source={{ uri }} className="w-24 h-24 rounded-xl" />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {postType === 'video' && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Video</Text>
            <TouchableOpacity
              onPress={pickVideo}
              className="bg-primary rounded-xl py-4 items-center"
            >
              <Ionicons name="videocam" size={24} color="white" />
              <Text className="text-white font-semibold mt-2">Select Video</Text>
            </TouchableOpacity>
            
            {videoUrl && (
              <View className="mt-3 p-3 bg-gray-100 rounded-xl">
                <Text className="text-sm text-gray-700">Video selected</Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Tags</Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <View key={index} className="bg-primary px-3 py-2 rounded-full flex-row items-center">
                <Text className="text-white font-semibold mr-2">{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
            placeholder="Add tags (press enter)"
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={(e) => {
              addTag(e.nativeEvent.text);
              e.nativeEvent.text = '';
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

