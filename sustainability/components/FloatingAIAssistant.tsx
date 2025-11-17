import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Modal, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GeminiWrapper from './GeminiWrapper';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_ENDPOINT = process.env.EXPO_PUBLIC_GEMINI_ENDPOINT || '';

export default function FloatingAIAssistant() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Animation values - use refs to persist across renders
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous bounce animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    bounceAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      bounceAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              { scale: pulseAnim },
              { translateY: bounceAnim },
              { rotate },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          style={styles.button}
          activeOpacity={0.8}
        >
          <Ionicons name="construct" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Farming Assistant</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <GeminiWrapper 
              endpoint={GEMINI_ENDPOINT} 
              apiKey={GEMINI_API_KEY}
              initialMessage="Hey! I'm your AI farming assistant. Ask me anything about farming, sustainability, or your products!"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    elevation: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
});

