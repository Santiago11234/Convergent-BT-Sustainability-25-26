import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
}

export function MessageInput({ onSend, sending }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = async () => {
    console.log("sending message:", text);
    if (!text.trim() || sending) return;

    const success = await onSend(text);
    console.log("sending result:", success);
    if (success) {
      setText('');
    }
  };

  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-200">
      <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-2">
        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholder="Type a message..."
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
        disabled={!text.trim() || sending}
        className={`w-11 h-11 rounded-full items-center justify-center ${
          text.trim() && !sending ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons
            name="send"
            size={20}
            color={text.trim() ? '#FFFFFF' : '#9CA3AF'}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}
