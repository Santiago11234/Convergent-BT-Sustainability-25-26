import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
}

interface GeminiWrapperProps {
  apiKey?: string; // API key or Bearer token
  endpoint?: string; // full URL for the Gemini/generative API endpoint
  model?: string; // optional model identifier
  initialMessage?: string; // initial message to display from assistant
}

export default function GeminiWrapper({ apiKey, endpoint, model = 'chat-bison-001', initialMessage }: GeminiWrapperProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasInitialized = useRef(false);

  // Add initial message when component mounts
  useEffect(() => {
    if (initialMessage && !hasInitialized.current && messages.length === 0) {
      setMessages([{ role: 'assistant', content: initialMessage }]);
      hasInitialized.current = true;
    }
  }, [initialMessage, messages.length]);


  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userContent = inputText.trim() || '';
    const imageToSend = selectedImage;
    
    const userMessage: Message = { 
      role: 'user', 
      content: userContent || (imageToSend ? 'Photo' : ''),
      imageUri: imageToSend || undefined
    };
    setMessages(prev => [...prev, userMessage]);
    
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Build endpoint URL with API key as query parameter (Google Generative API requirement)
      let url = endpoint || `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
      if (apiKey) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}key=${encodeURIComponent(apiKey)}`;
      }

      // Gemini API specific request format
      const body = {
        contents: [...messages, userMessage].map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      // Read response as text first to handle non-JSON responses
      const responseText = await response.text();
      
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Gemini wrapper - JSON parse error. Raw response:', responseText.substring(0, 500));
        console.error('Response status:', response.status, response.statusText);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: Invalid response from Gemini API (HTTP ${response.status}). Check console for details.` 
        }]);
        return;
      }

      // Check for API errors
      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || data.error?.reason || 'Unknown error';
        console.error('Gemini API error:', errorMsg);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${errorMsg}` 
        }]);
        return;
      }

      // Parse Gemini API response
      let assistantText = '';
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        assistantText = data.candidates[0].content.parts[0].text;
      } else if (data?.candidates?.[0]?.content?.[0]?.text) {
        assistantText = data.candidates[0].content[0].text;
      } else {
        console.warn('Unexpected Gemini response format:', JSON.stringify(data).substring(0, 500));
        assistantText = 'Error: Unexpected response format from Gemini API';
      }

      const assistantMessage = { role: 'assistant', content: assistantText } as Message;
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Gemini wrapper error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: failed to get a response from Gemini endpoint.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasContent = inputText.trim() || selectedImage;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-background-light px-4"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
          {messages.map((message, index) => (
            <View
              key={index}
              className={`flex-row mb-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <View className={`max-w-[75%] rounded-2xl ${message.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                {message.imageUri && (
                  <Image
                    source={{ uri: message.imageUri }}
                    className="w-full h-48 rounded-t-2xl mb-1"
                    resizeMode="cover"
                  />
                )}
                <View 
                  className={`px-3 py-2 ${message.imageUri ? 'rounded-b-2xl' : 'rounded-2xl'}`}
                  style={message.role === 'user' 
                    ? { backgroundColor: '#A8BF96' }
                    : { backgroundColor: '#563D1F' }
                  }
                >
                  <Text className={`text-base leading-5 ${
                    message.role === 'user' ? 'text-gray-900' : 'text-white'
                  }`}>
                    {message.content}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {isLoading && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#8FAA7C" />
            </View>
          )}
        </ScrollView>

        <View className="bg-background-light border-t border-gray-200">
          {/* Selected Image Preview */}
          {selectedImage && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="px-4 pt-2 pb-2"
            >
              <View className="relative mr-2">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-20 h-20 rounded-lg"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                >
                  <Ionicons name="close" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          <View className="flex-row items-center px-4 py-3">
            <TouchableOpacity
              onPress={pickImage}
              disabled={isLoading || selectedImage !== null}
              className="w-11 h-11 rounded-full items-center justify-center bg-gray-100 mr-2"
            >
              <Ionicons name="image-outline" size={22} color="#6B7280" />
            </TouchableOpacity>

            <View className="flex-1 flex-row items-center bg-background-light rounded-full px-4 py-2 mr-2 border border-gray-200">
              <TextInput
                className="flex-1 text-base text-gray-900"
                style={{ color: '#111827', maxHeight: 100 }}
                placeholder={selectedImage ? "Add a caption..." : "Type your message..."}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                editable={!isLoading}
                onSubmitEditing={sendMessage}
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!hasContent || isLoading}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                hasContent && !isLoading ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              {isLoading ? (
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
    </KeyboardAvoidingView>
  );
}
