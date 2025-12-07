import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useMarketplace, VerificationResult } from '@/contexts/MarketplaceContext';
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

const VERIFICATION_ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'right', label: 'Right' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
];

const PROMPT_DURATION_MS = 4500;
const GUIDED_PROMPT_INSTRUCTIONS: Record<string, { title: string; instruction: string }> = {
  front: {
    title: 'Face the produce',
    instruction: 'Align the front of the produce in frame. Hold steady.',
  },
  right: {
    title: 'Rotate right side',
    instruction: 'Slowly move to the right so we can see the side profile.',
  },
  back: {
    title: 'Capture the back',
    instruction: 'Rotate further until the back of the produce fills the frame.',
  },
  left: {
    title: 'Rotate left side',
    instruction: 'Continue rotating so the opposite side is visible.',
  },
  top: {
    title: 'Tilt downward',
    instruction: 'Hold the camera above to show the top surface.',
  },
  bottom: {
    title: 'Tilt upward',
    instruction: 'Carefully angle up to show the underside/bottom.',
  },
};

export default function CreatePostScreen() {
  const router = useRouter();
  const { addProduct, uploadImage, verifyProduce, classifyFreshStale: classifyFreshStaleAPI } = useMarketplace();
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
  const [verificationImages, setVerificationImages] = useState<Record<string, string>>({});
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const promptTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const hasCameraPermission = cameraPermission?.granted ?? null;
  const ensureCameraPermission = useCallback(async (): Promise<boolean> => {
    if (cameraPermission?.granted) {
      return true;
    }

    try {
      const response = await requestPermission();
      if (response?.granted) {
        return true;
      }

      const latest = response ?? cameraPermission;
      Alert.alert(
        'Camera access needed',
        latest?.canAskAgain === false
          ? 'Enable camera permissions in Settings to record guided produce verification videos.'
          : 'Please grant camera access to continue.',
      );
      return false;
    } catch (error) {
      console.error('Camera permission error', error);
      Alert.alert('Camera error', 'Unable to request camera permission. Please try again.');
      return false;
    }
  }, [cameraPermission, requestPermission]);
  const [verificationVideoUri, setVerificationVideoUri] = useState<string | null>(null);
  const [guidedCaptureState, setGuidedCaptureState] = useState<'idle' | 'recording' | 'processing' | 'completed'>('idle');
  const [currentGuidedPromptIndex, setCurrentGuidedPromptIndex] = useState(0);
  const [guidedKeyFrames, setGuidedKeyFrames] = useState<Record<string, string>>({});
  const [lastRecordingDurationMs, setLastRecordingDurationMs] = useState<number | null>(null);
  const [freshStalePhoto, setFreshStalePhoto] = useState<string | null>(null);
  const [freshStaleResult, setFreshStaleResult] = useState<{ isFresh: boolean; confidence: number } | null>(null);
  const [classifyingFreshStale, setClassifyingFreshStale] = useState(false);
  const [frameClassificationResults, setFrameClassificationResults] = useState<Record<string, { isFresh: boolean; confidence: number }>>({});
  const [classifyingFrames, setClassifyingFrames] = useState(false);
  const verificationAngles = useMemo(() => VERIFICATION_ANGLES, []);
  const allAnglesCaptured = useMemo(
    () => verificationAngles.every((angle) => Boolean(verificationImages[angle.key])),
    [verificationAngles, verificationImages],
  );
  const allGuidedFramesCaptured = useMemo(
    () => verificationAngles.every((angle) => Boolean(guidedKeyFrames[angle.key])),
    [verificationAngles, guidedKeyFrames],
  );
  const isNextDisabled = useMemo(() => {
    if (currentStep === 4) {
      // Only require video capture to be complete
      if (guidedCaptureState === 'recording' || guidedCaptureState === 'processing') {
        return true;
      }

      if (!verificationVideoUri || !allGuidedFramesCaptured) {
        return true;
      }

      // If frames are being classified, disable Next
      if (classifyingFrames) {
        return true;
      }
    }
    if (currentStep === 5) {
      // Summary step - always allow
    }
    return false;
  }, [
    allGuidedFramesCaptured,
    currentStep,
    classifyingFreshStale,
    classifyingFrames,
    guidedCaptureState,
    verificationVideoUri,
  ]);

  useEffect(() => {
    setVerificationResult(null);
    setVerificationError(null);
  }, [postData.title, postData.category]);

  useEffect(() => {
    if (currentStep === 4 && typeof cameraPermission === 'undefined') {
      requestPermission().catch(() => {});
    }

    if (currentStep !== 4 && guidedCaptureState === 'recording') {
      stopGuidedCapture();
    }
  }, [currentStep, cameraPermission, guidedCaptureState, requestPermission]);


  useEffect(() => {
    if (guidedCaptureState === 'recording') {
      schedulePromptSequence();
    } else {
      clearPromptTimers();
    }
  }, [guidedCaptureState]);

  useEffect(() => {
    if (guidedCaptureState === 'recording') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentGuidedPromptIndex, guidedCaptureState]);

  useEffect(() => {
    return () => {
      clearPromptTimers();
      if (guidedCaptureState === 'recording') {
        stopGuidedCapture();
      }
    };
  }, [guidedCaptureState]);

  const updatePostData = (field: keyof PostData, value: any) => {
    setPostData(prev => ({ ...prev, [field]: value }));
  };

  const clearPromptTimers = () => {
    promptTimersRef.current.forEach(timer => clearTimeout(timer));
    promptTimersRef.current = [];
  };

  const stopGuidedCapture = () => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
      } catch (error) {
        console.warn('Failed to stop recording', error);
      }
    }
  };

  const resetGuidedCapture = () => {
    stopGuidedCapture();
    clearPromptTimers();
    setGuidedCaptureState('idle');
    setVerificationVideoUri(null);
    setGuidedKeyFrames({});
    setCurrentGuidedPromptIndex(0);
    setLastRecordingDurationMs(null);
    setFrameClassificationResults({});
  };

  const schedulePromptSequence = () => {
    clearPromptTimers();
    setCurrentGuidedPromptIndex(0);

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    verificationAngles.forEach((angle, index) => {
      const timer = setTimeout(() => {
        setCurrentGuidedPromptIndex(index);

        if (index === verificationAngles.length - 1) {
          setTimeout(() => stopGuidedCapture(), PROMPT_DURATION_MS - 500);
        }
      }, index * PROMPT_DURATION_MS);
      timers.push(timer);
    });

    promptTimersRef.current = timers;
  };

  const extractGuidedKeyFrames = async (videoUri: string, durationMs?: number) => {
    const frames: Record<string, string> = {};
    const fallbackDuration = PROMPT_DURATION_MS * verificationAngles.length;
    const totalDuration = durationMs && durationMs > 0 ? durationMs : fallbackDuration;

    for (let index = 0; index < verificationAngles.length; index += 1) {
      const angle = verificationAngles[index];
      const progress = (index + 0.5) / verificationAngles.length;
      const sampleTimeMs = Math.max(
        0,
        Math.min(totalDuration - 500, Math.round(progress * totalDuration)),
      );

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: sampleTimeMs,
        });
        frames[angle.key] = uri;
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${angle.key}`, error);
      }
    }

    if (Object.keys(frames).length > 0) {
      setGuidedKeyFrames(frames);
      setVerificationImages(frames);
      setVerificationResult(null);
      setVerificationError(null);
      
      // Automatically classify each extracted frame
      await classifyAllFrames(frames);
    }
  };

  const classifyAllFrames = async (frames: Record<string, string>) => {
    setClassifyingFrames(true);
    const results: Record<string, { isFresh: boolean; confidence: number }> = {};

    try {
      // Classify each frame
      for (const [angleKey, frameUri] of Object.entries(frames)) {
        try {
          const result = await classifyFreshStaleAPI(frameUri);
          results[angleKey] = result;
        } catch (error) {
          console.error(`Failed to classify frame ${angleKey}:`, error);
          // Mark as failed but continue
          results[angleKey] = { isFresh: false, confidence: 0 };
        }
      }

      setFrameClassificationResults(results);
    } catch (error) {
      console.error('Error classifying frames:', error);
    } finally {
      setClassifyingFrames(false);
    }
  };

  const startGuidedCapture = async () => {
    if (guidedCaptureState === 'recording' || guidedCaptureState === 'processing') {
      return;
    }

    const granted = await ensureCameraPermission();
    if (!granted) {
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Camera unavailable', 'Please wait for the camera to initialize.');
      return;
    }

    setVerificationVideoUri(null);
    setGuidedKeyFrames({});
    setGuidedCaptureState('recording');

    try {
      const recordingStart = Date.now();
      cameraRef.current
        .recordAsync({
          maxDuration: Math.ceil((PROMPT_DURATION_MS * verificationAngles.length + 1500) / 1000),
        })
        .then(async (recording) => {
          if (!recording?.uri) {
            setGuidedCaptureState('idle');
            return;
          }

          const durationMs = Date.now() - recordingStart;

          setVerificationVideoUri(recording.uri);
          setLastRecordingDurationMs(durationMs);
          setGuidedCaptureState('processing');

          await extractGuidedKeyFrames(recording.uri, durationMs ?? undefined);
          setGuidedCaptureState('completed');
        })
        .catch((error) => {
          console.error('Guided capture failed', error);
          setGuidedCaptureState('idle');
          Alert.alert('Recording error', 'Failed to capture video. Please try again.');
        })
        .finally(() => {
          clearPromptTimers();
        });
    } catch (error) {
      console.error('Failed to start recording', error);
      setGuidedCaptureState('idle');
      Alert.alert('Recording error', 'Unable to start recording. Please try again.');
    }
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

  const getVerificationStatusStyles = (status: VerificationResult['status']) => {
    switch (status) {
      case 'approved':
        return {
          container: 'bg-green-50 border border-green-200',
          label: 'text-green-700',
          statusText: 'text-green-600',
        };
      case 'manual_review':
        return {
          container: 'bg-yellow-50 border border-yellow-200',
          label: 'text-yellow-700',
          statusText: 'text-yellow-600',
        };
      case 'rejected':
      case 'failed':
        return {
          container: 'bg-red-50 border border-red-200',
          label: 'text-red-700',
          statusText: 'text-red-600',
        };
      default:
        return {
          container: 'bg-background-light border border-gray-200',
          label: 'text-gray-700',
          statusText: 'text-gray-600',
        };
    }
  };

  const captureFreshStalePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera access is required to capture a photo for freshness check.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setFreshStalePhoto(uri);
        setFreshStaleResult(null);
        // Automatically classify after capture
        await classifyFreshStale(uri);
      }
    } catch (error) {
      console.error('Error capturing fresh/stale photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const classifyFreshStale = async (photoUri: string) => {
    if (!photoUri) return;

    setClassifyingFreshStale(true);
    try {
      const result = await classifyFreshStaleAPI(photoUri);
      setFreshStaleResult(result);
    } catch (error) {
      console.error('Fresh/stale classification failed:', error);
      Alert.alert('Classification error', 'Failed to classify produce freshness. Please try again.');
    } finally {
      setClassifyingFreshStale(false);
    }
  };

  const handleVerifyProduce = async () => {
    if (!allAnglesCaptured) {
      Alert.alert('Incomplete capture', 'Please capture all required angles before running verification.');
      return;
    }

    if (!postData.title.trim()) {
      Alert.alert('Missing title', 'Add a product title before running verification.');
      return;
    }

    setVerifying(true);
    setVerificationError(null);

    try {
      const payload = verificationAngles.map(angle => ({
        angle: angle.key,
        uri: verificationImages[angle.key],
      }));

      const result = await verifyProduce({
        productTitle: postData.title.trim(),
        category: postData.category,
        images: payload,
        video: verificationVideoUri
          ? {
              uri: verificationVideoUri,
              durationMs: lastRecordingDurationMs ?? undefined,
            }
          : null,
        captureMethod: verificationVideoUri ? 'guided_video' : 'manual_photos',
      });

      setVerificationResult(result);
    } catch (error) {
      console.error('Verification failed:', error);
      const message = error instanceof Error ? error.message : 'Unable to verify produce. Please try again later.';
      setVerificationError(message);
      Alert.alert('Verification error', message);
    } finally {
      setVerifying(false);
    }
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
    } else if (currentStep === 4) {
      if (guidedCaptureState === 'recording' || guidedCaptureState === 'processing') {
        Alert.alert('Processing video', 'Please wait until the video capture finishes processing.');
        return;
      }

      if (!verificationVideoUri || !allGuidedFramesCaptured) {
        Alert.alert(
          'Capture required',
          'Complete the guided video capture to generate the required angles before continuing.',
        );
        return;
      }

      // If frames are being classified, block advance
      if (classifyingFrames) {
        Alert.alert('Processing', 'Please wait while frames are being analyzed.');
        return;
      }
    } else if (currentStep === 5) {
      // Summary step - no validation needed, can post
    }

    // Skip step 6, go directly to summary (step 5)
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 5) {
      // Already at summary, don't advance further
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

    // Check if frames are still being classified
    if (classifyingFrames) {
      Alert.alert('Processing', 'Please wait while frames are being analyzed.');
      return;
    }

    // Optional: Check if most frames are fresh (you can adjust this threshold)
    const frameResults = Object.values(frameClassificationResults);
    if (frameResults.length > 0) {
      const freshCount = frameResults.filter(r => r.isFresh).length;
      const freshRatio = freshCount / frameResults.length;
      
      if (freshRatio < 0.5) {
        Alert.alert(
          'Most frames detected as stale',
          'Please ensure you\'re selling fresh produce. Most frames from your video appear stale.',
        );
        return;
      }
    }

    // Step 6 (fresh/stale photo) is now optional - skip it

    try {
      // Upload images to Supabase Storage
      let imageUrls: string[] = [];
      if (postData.images && postData.images.length > 0) {
        // Show loading indicator (you might want to add a proper loading state UI here)
        imageUrls = await Promise.all(
          postData.images.map((uri) => uploadImage(uri))
        );
      }

      const verificationTimestamp = new Date().toISOString();
      const processedAt =
        verificationResult?.metadata && typeof verificationResult.metadata?.processedAt === 'string'
          ? verificationResult.metadata.processedAt
          : null;

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
        images: imageUrls,
        // Add the new fields
        payment_methods: selectedPaymentMethods,
        other_payment_method: otherPaymentMethod,
        pickup_instructions: postData.pickupInstructions,
        pickup_latitude: postData.pickupLatitude || null,
        pickup_longitude: postData.pickupLongitude || null,
        is_residential: postData.isResidential,
        latitude: postData.latitude || null,
        longitude: postData.longitude || null,
        verification_status: 'approved', // Auto-approved since we're checking frames
        verification_confidence: frameResults.length > 0 
          ? frameResults.reduce((sum, r) => sum + r.confidence, 0) / frameResults.length 
          : 0.85,
        verification_ripeness_score: frameResults.length > 0
          ? frameResults.filter(r => r.isFresh).length / frameResults.length
          : 0.85,
        verification_notes: frameResults.length > 0
          ? [`Analyzed ${frameResults.length} frames: ${frameResults.filter(r => r.isFresh).length} fresh, ${frameResults.filter(r => !r.isFresh).length} stale`]
          : ['Video verification completed'],
        verification_metadata: {
          frameAnalysis: frameClassificationResults,
          videoUrl: null, // Video stored separately if needed
          freshnessCheck: freshStaleResult ? {
            isFresh: freshStaleResult.isFresh,
            confidence: freshStaleResult.confidence,
            photoUrl: freshStalePhoto ? await uploadImage(freshStalePhoto, { folder: 'freshness-check' }) : null,
          } : null,
        } as any,
        verification_requested_at: verificationTimestamp,
        verification_completed_at: processedAt || verificationTimestamp,
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
      setVerificationImages({});
      setVerificationResult(null);
      setVerificationError(null);
      setVerificationVideoUri(null);
      setGuidedKeyFrames({});
      setGuidedCaptureState('idle');
      setCurrentGuidedPromptIndex(0);
      setLastRecordingDurationMs(null);
      setFreshStalePhoto(null);
      setFreshStaleResult(null);
      setFrameClassificationResults({});

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
      {[1, 2, 3, 4, 5].map((step) => (
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
        {step < 5 && (
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
          className="bg-background-light border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg"
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
          className="bg-background-light border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg h-32"
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
                  : 'bg-background-light border-gray-200'
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
        <View className="bg-background-light border-2 border-gray-200 rounded-2xl p-4">
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
        <View className="bg-background-light rounded-2xl p-6 shadow-sm mb-6">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Price *</Text>
              <TextInput
                className="bg-background-light border-2 border-gray-200 rounded-xl px-5 py-4 text-lg"
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
                className="bg-background-light border-2 border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
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
        <View className="bg-background-light rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Available Quantity</Text>
          <TextInput
            className="bg-background-light border-2 border-gray-200 rounded-xl px-5 py-4 text-lg"
            placeholder="e.g., 50 lbs available"
            value={postData.availableQuantity}
            onChangeText={(text) => updatePostData('availableQuantity', text)}
          />
        </View>

        {/* Payment Methods */}
        <View className="bg-background-light rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Accepted Payment Methods</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Cash App', 'In-App', 'Other'].map((method) => (
              <TouchableOpacity
                key={method}
                onPress={() => togglePaymentMethod(method)}
                className={`px-3 py-2 rounded-full border ${
                  selectedPaymentMethods.includes(method)
                    ? 'bg-primary border-primary'
                    : 'bg-background-light border-gray-200'
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
                className="bg-background-light border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
                placeholder="e.g., Apple Pay, Google Pay, Check..."
                value={otherPaymentMethod}
                onChangeText={setOtherPaymentMethod}
              />
            </View>
          )}
        </View>

        {/* Tags */}
        <View className="bg-background-light rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Tags</Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                className={`px-3 py-2 rounded-full ${
                  postData.tags.includes(tag) ? 'bg-primary' : 'bg-background-light'
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
          <View className="absolute top-32 right-4 w-32 bg-background-light rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <View className="bg-background-light p-2 border-b border-gray-100">
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
                    : 'bg-background-light'
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
          className="bg-background-light border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg"
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
          className="bg-background-light border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg h-24"
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
              postData.isResidential ? 'bg-primary border-primary' : 'bg-background-light border-gray-200'
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
              !postData.isResidential ? 'bg-primary border-primary' : 'bg-background-light border-gray-200'
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

  const renderStep4 = () => {
    const statusStyles = verificationResult ? getVerificationStatusStyles(verificationResult.status) : null;
    const currentAngle = verificationAngles[currentGuidedPromptIndex];
    const promptInfo = currentAngle ? GUIDED_PROMPT_INSTRUCTIONS[currentAngle.key] : null;
    const isRecording = guidedCaptureState === 'recording';
    const isProcessing = guidedCaptureState === 'processing';
    const captureComplete = guidedCaptureState === 'completed' && verificationVideoUri;
    const progress =
      guidedCaptureState === 'recording'
        ? (currentGuidedPromptIndex + 1) / verificationAngles.length
        : captureComplete
          ? 1
          : 0;

    return (
      <View>
        <View className="items-center mb-4">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Guided Video Capture</Text>
          <Text className="text-base text-gray-600 text-center px-4">
            Record a short guided video to cover every angle. We’ll extract frames automatically for AI
            verification.
          </Text>
        </View>

        <View className="bg-background-light rounded-3xl p-4 shadow-sm">
          {hasCameraPermission === false && (
            <View className="items-center justify-center py-12 px-4">
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text className="text-lg font-semibold text-gray-800 mt-4">Camera access blocked</Text>
              <Text className="text-sm text-gray-600 text-center mt-2">
                Enable camera permissions in your device settings to record verification videos.
              </Text>
              <TouchableOpacity
                onPress={ensureCameraPermission}
                className="mt-4 px-6 py-3 bg-primary rounded-xl"
              >
                <Text className="text-white font-semibold">Retry permission</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasCameraPermission !== false && (
            <View>
              <View className="h-72 rounded-2xl overflow-hidden bg-black mb-4 border-2 border-gray-200 relative">
                {hasCameraPermission === null && (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#8FAA7C" size="large" />
                    <Text className="text-sm text-gray-500 mt-2">Initializing camera...</Text>
                  </View>
                )}

                {hasCameraPermission && (
                  <CameraView
                    ref={(ref) => {
                      cameraRef.current = ref;
                    }}
                    style={{ flex: 1 }}
                    facing="back"
                    mode="video"
                    videoQuality="1080p"
                    ratio="16:9"
                  >
                    <View className="absolute top-0 left-0 right-0 p-3">
                      <View className="bg-black/50 rounded-full px-4 py-1 self-center">
                        <Text className="text-white text-xs font-semibold">
                          {isRecording ? 'Recording in progress' : captureComplete ? 'Capture complete' : 'Ready'}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="absolute inset-x-0 bottom-0 p-4"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                    >
                      <Text className="text-white text-lg font-semibold">
                        {promptInfo?.title || 'Ready to capture'}
                      </Text>
                      <Text className="text-white text-sm mt-1">
                        {promptInfo?.instruction ||
                          'Press start and follow the prompts to rotate the produce slowly.'}
                      </Text>
                      <View className="h-2 bg-background-light/20 rounded-full mt-3">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(progress * 100, 100)}%` }}
                        />
                      </View>
                    </View>
                  </CameraView>
                )}

                {isProcessing && (
                  <View className="absolute inset-0 bg-black/60 items-center justify-center">
                    <ActivityIndicator color="#FFFFFF" />
                    <Text className="text-white font-semibold mt-3">Processing video…</Text>
                    <Text className="text-white/70 text-xs mt-1">
                      Extracting key frames for AI verification
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2 mb-4">
                {verificationAngles.map((angle, index) => {
                  const isComplete = Boolean(guidedKeyFrames[angle.key]);
                  const isActive = currentGuidedPromptIndex === index && isRecording;
                  const backgroundColor = isComplete
                    ? '#ECFDF3'
                    : isActive
                      ? 'rgba(34,197,94,0.12)'
                      : '#F3F4F6';
                  const borderColor = isComplete
                    ? '#BBF7D0'
                    : isActive
                      ? '#86EFAC'
                      : '#E5E7EB';
                  const textColor = isComplete
                    ? '#047857'
                    : isActive
                      ? '#16A34A'
                      : '#4B5563';
                  return (
                    <View
                      key={angle.key}
                      className="flex-1 px-3 py-2 rounded-xl border"
                      style={{ minWidth: '30%', backgroundColor, borderColor }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: textColor }}>
                        Step {index + 1}: {angle.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="flex-row gap-3">
                {!isRecording && guidedCaptureState !== 'processing' && (
                  <TouchableOpacity
                    onPress={startGuidedCapture}
                    className="flex-1 bg-primary rounded-xl py-4 items-center"
                    disabled={isProcessing}
                  >
                    <Text className="text-base font-semibold text-white">
                      {captureComplete ? 'Retake guided video' : 'Start guided capture'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isRecording && (
                  <TouchableOpacity
                    onPress={stopGuidedCapture}
                    className="flex-1 bg-red-500 rounded-xl py-4 items-center"
                  >
                    <Text className="text-base font-semibold text-white">Stop recording</Text>
                  </TouchableOpacity>
                )}

                {captureComplete && (
                  <TouchableOpacity
                    onPress={resetGuidedCapture}
                    className="px-4 py-4 bg-background-light rounded-xl items-center justify-center"
                  >
                    <Ionicons name="refresh" size={20} color="#4B5563" />
                    <Text className="text-xs text-gray-600 mt-1">Reset</Text>
                  </TouchableOpacity>
                )}
              </View>

              {verificationVideoUri && (
                <View className="mt-6">
                  <Text className="text-base font-semibold text-gray-800 mb-3">Video preview</Text>
                  <View className="h-56 rounded-2xl overflow-hidden border border-gray-200">
                    <Video
                      source={{ uri: verificationVideoUri }}
                      style={{ flex: 1 }}
                      useNativeControls
                    />
                  </View>
                  {lastRecordingDurationMs && (
                    <Text className="text-xs text-gray-500 mt-2">
                      Duration: {(lastRecordingDurationMs / 1000).toFixed(1)} seconds
                    </Text>
                  )}
                </View>
              )}

              <View className="mt-6">
                <Text className="text-base font-semibold text-gray-800 mb-3">
                  Extracted key frames & freshness analysis
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {verificationAngles.map((angle) => {
                    const frameUri = guidedKeyFrames[angle.key];
                    const classification = frameClassificationResults[angle.key];
                    const isFresh = classification?.isFresh ?? null;
                    const confidence = classification?.confidence ?? 0;
                    
                    return (
                      <View
                        key={angle.key}
                        className="rounded-xl border-2 overflow-hidden bg-background-light items-center justify-center relative"
                        style={{ 
                          width: '30%', 
                          aspectRatio: 1,
                          borderColor: classification 
                            ? (isFresh ? '#BBF7D0' : '#FECACA')
                            : '#E5E7EB'
                        }}
                      >
                        {frameUri ? (
                          <>
                            <Image source={{ uri: frameUri }} className="w-full h-full" resizeMode="cover" />
                            {classification && (
                              <View 
                                className={`absolute top-1 right-1 px-2 py-1 rounded-lg ${
                                  isFresh ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              >
                                <Ionicons 
                                  name={isFresh ? 'checkmark-circle' : 'close-circle'} 
                                  size={16} 
                                  color="white" 
                                />
                              </View>
                            )}
                            {classification && (
                              <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                                <Text className="text-white text-xs font-semibold text-center">
                                  {isFresh ? 'Fresh' : 'Stale'}
                                </Text>
                              </View>
                            )}
                            {!classification && classifyingFrames && (
                              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <ActivityIndicator color="#FFFFFF" size="small" />
                              </View>
                            )}
                          </>
                        ) : (
                          <View className="items-center">
                            <Ionicons name="image" size={24} color="#9CA3AF" />
                            <Text className="text-xs text-gray-500 mt-1">{angle.label}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                {Object.keys(frameClassificationResults).length > 0 && (
                  <View className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <Text className="text-sm font-semibold text-blue-800 mb-2">
                      Frame Analysis Summary
                    </Text>
                    <Text className="text-xs text-blue-700">
                      Fresh frames: {Object.values(frameClassificationResults).filter(r => r.isFresh).length} / {Object.keys(frameClassificationResults).length}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {classifyingFrames && (
          <View className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#3B82F6" />
              <Text className="text-base font-semibold text-blue-800 ml-3">
                Analyzing freshness of all frames...
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderStep5 = () => {
    const statusStyles = verificationResult ? getVerificationStatusStyles(verificationResult.status) : null;

    return (
      <View className="flex-1">
        {/* Full Screen Post Summary */}
        <View className="flex-1 bg-green-50 rounded-3xl p-6 mx-2">
          <View className="items-center mb-8">
            <Text className="text-2xl font-bold text-green-800">Post Summary</Text>
          </View>
          
          {/* Main Product Info */}
          <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
            <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">{postData.title}</Text>
            <Text className="text-2xl font-bold text-primary mb-4 text-center">
              ${postData.price}<Text className="text-lg text-gray-500 font-normal">/{postData.unit}</Text>
            </Text>
            <Text className="text-lg text-gray-700 leading-6 text-center">{postData.description}</Text>
          </View>

          {/* Category */}
          <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="pricetag" size={24} color="#8FAA7C" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Category</Text>
            </View>
            <Text className="text-lg text-gray-700 text-center">{postData.category}</Text>
          </View>

          {/* Location */}
          <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Ionicons name="location" size={24} color="#8FAA7C" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Location</Text>
            </View>
            <Text className="text-lg text-gray-700 text-center">{postData.location || 'Not set'}</Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {postData.isResidential ? 'Residential Address' : 'Commercial Address'}
            </Text>
          </View>

          {/* Available Quantity */}
          {postData.availableQuantity && (
            <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Ionicons name="basket" size={24} color="#8FAA7C" />
                <Text className="text-xl font-bold text-gray-800 ml-3">Available Quantity</Text>
              </View>
              <Text className="text-lg text-gray-700 text-center">{postData.availableQuantity} {postData.unit}</Text>
            </View>
          )}

          {/* Payment Methods */}
          {selectedPaymentMethods.length > 0 && (
            <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Ionicons name="card" size={24} color="#8FAA7C" />
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
            <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Ionicons name="camera" size={24} color="#8FAA7C" />
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
            <View className="bg-background-light rounded-2xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Ionicons name="pricetag" size={24} color="#8FAA7C" />
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

          {verificationResult && (
            <View className="bg-background-light rounded-2xl p-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Ionicons name="shield-checkmark" size={24} color="#8FAA7C" />
                <Text className="text-xl font-bold text-gray-800 ml-3">AI Verification</Text>
              </View>
              <View className="flex-row justify-between mb-3">
                <Text className="text-lg font-semibold text-gray-900">Status</Text>
                <Text
                  className={`text-lg font-bold capitalize ${
                    statusStyles?.statusText || 'text-primary'
                  }`}
                >
                  {verificationResult.status.replace('_', ' ')}
                </Text>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 uppercase tracking-wide">Match Confidence</Text>
                  <Text className="text-lg font-semibold text-gray-900">{Math.round(verificationResult.confidence * 100)}%</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 uppercase tracking-wide">Ripeness Score</Text>
                  <Text className="text-lg font-semibold text-gray-900">{Math.round(verificationResult.ripenessScore * 100)}%</Text>
                </View>
              </View>
              {verificationResult.notes?.length > 0 && (
                <View className="mt-4">
                  {verificationResult.notes.map((note, index) => (
                    <Text key={index} className="text-sm text-gray-600">
                      • {note}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };


  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="bg-background px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Create Sell Order</Text>
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
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {/* Navigation */}
      <View className="bg-background px-4 py-4">
        <View className="flex-row gap-3">
          {currentStep > 1 && (
            <TouchableOpacity
              onPress={prevStep}
              className="flex-1 bg-background-light rounded-xl py-4 items-center"
            >
              <Text className="text-base font-semibold text-gray-700">Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 5 ? (
            <TouchableOpacity
              onPress={nextStep}
              disabled={isNextDisabled}
              className={`flex-1 rounded-xl py-4 items-center ${
                isNextDisabled ? 'bg-gray-300' : 'bg-primary'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  isNextDisabled ? 'text-gray-600' : 'text-white'
                }`}
              >
                Next
              </Text>
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
