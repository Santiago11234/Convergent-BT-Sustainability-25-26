import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/database.types';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const images = message.images || [];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const getImageSize = (imageCount: number) => {
    if (imageCount === 1) return { width: 250, height: 250 };
    if (imageCount === 2) return { width: 120, height: 120 };
    return { width: 100, height: 100 };
  };

  const imageSize = getImageSize(images.length);

  return (
    <>
      <View
        className={`flex-row mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`max-w-[75%] px-3 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-primary rounded-br-sm'
              : 'bg-gray-100 rounded-bl-sm'
          }`}
        >
          {/* Images */}
          {images.length > 0 && (
            <View className={`mb-2 ${images.length > 1 ? 'flex-row flex-wrap gap-1' : ''}`}>
              {images.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setExpandedImage(imageUrl)}
                  activeOpacity={0.9}
                  style={{
                    width: images.length === 1 ? 250 : imageSize.width,
                    height: images.length === 1 ? 250 : imageSize.height,
                  }}
                  className="rounded-lg overflow-hidden"
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Text */}
          {message.text && message.text.trim() && (
            <Text
              className={`text-base leading-5 ${
                isOwnMessage ? 'text-white' : 'text-gray-900'
              }`}
            >
              {message.text}
            </Text>
          )}

          {/* Timestamp and read status */}
          <View className="flex-row items-center justify-end mt-1 gap-1">
            <Text
              className={`text-xs ${
                isOwnMessage ? 'text-white/70' : 'text-gray-500'
              }`}
            >
              {formatTime(message.created_at)}
            </Text>
            {isOwnMessage && message.is_read && (
              <Text className="text-xs text-white/70">• Read</Text>
            )}
          </View>
        </View>
      </View>

      {/* Expanded Image Modal */}
      <Modal
        visible={expandedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            className="absolute top-12 right-4 z-10 bg-black/50 rounded-full p-2"
            onPress={() => setExpandedImage(null)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {expandedImage && (
            <Image
              source={{ uri: expandedImage }}
              style={{
                width: SCREEN_WIDTH - 40,
                height: SCREEN_WIDTH - 40,
              }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}
