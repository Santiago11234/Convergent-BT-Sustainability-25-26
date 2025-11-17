import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiWrapperProps {
  apiKey?: string; // API key or Bearer token
  endpoint?: string; // full URL for the Gemini/generative API endpoint
  model?: string; // optional model identifier
}

export default function GeminiWrapper({ apiKey, endpoint, model = 'chat-bison-001' }: GeminiWrapperProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: 'user', content: inputText.trim() } as Message;
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
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

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0000ff" />
          </View>
        )}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={24} color={inputText.trim() ? '#22C55E' : '#999'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#22C55E',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
});