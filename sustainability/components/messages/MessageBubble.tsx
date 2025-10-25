import React from 'react';
import { View, Text } from 'react-native';
import { Message } from '@/types/database.types';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <View
      className={`flex-row mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <View
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isOwnMessage
            ? 'bg-primary rounded-br-sm'
            : 'bg-gray-100 rounded-bl-sm'
        }`}
      >
        <Text
          className={`text-base leading-5 ${
            isOwnMessage ? 'text-white' : 'text-gray-900'
          }`}
        >
          {message.text}
        </Text>
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
  );
}
