import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductInsert, ProductWithSeller, ProductVerificationStatus } from '@/types';
import { User } from '@/types';
import { calculateDistance, DEFAULT_LOCATION } from '@/utils/distance';

export interface VerificationImageInput {
  angle: string;
  uri: string;
}

export interface VerificationResult {
  status: ProductVerificationStatus;
  confidence: number;
  ripenessScore: number;
  matchedProduct: string | null;
  notes: string[];
  metadata?: Record<string, any>;
}

export interface VerificationVideoInput {
  uri: string;
  durationMs?: number | null;
}

export interface MarketplacePost {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  location: string;
  images: string[];
  tags: string[];
  organic: boolean;
  availableQuantity: string;
  seller: string;
  distance: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  isResidential: boolean;
  pickupPoint: string;
  pickupInstructions: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  image: string; // For compatibility with mock data
}

interface MarketplaceContextType {
  products: (ProductWithSeller & { distance: number })[];
  addProduct: (product: Omit<ProductInsert, 'seller_id'>) => Promise<void>;
  loadProducts: () => Promise<void>;
  newProductId: string | null;
  clearNewProductId: () => void;
  loading: boolean;
  uploadImage: (localUri: string, options?: { folder?: string }) => Promise<string>;
  verifyProduce: (params: {
    productTitle: string;
    category?: string;
    productId?: string;
    images: VerificationImageInput[];
    video?: VerificationVideoInput | null;
    captureMethod?: 'guided_video' | 'manual_photos';
  }) => Promise<VerificationResult>;
  classifyFreshStale: (imageUri: string) => Promise<{ isFresh: boolean; confidence: number }>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};

export const MarketplaceProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<(ProductWithSeller & { distance: number })[]>([]);
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load products from Supabase on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!products_seller_id_fkey (
            id,
            email,
            name,
            profile_pic_url,
            bio,
            location_lat,
            location_long,
            address,
            seller_rating,
            review_count,
            is_verified_seller,
            phone,
            follower_count,
            following_count,
            created_at,
            last_active,
            updated_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading products:', error);
        return;
      }

      if (data) {
        // Calculate distances and add to products
        const productsWithDistance = data.map((product) => {
          let distance = 0;
          if (product.seller?.location_lat && product.seller?.location_long) {
            distance = calculateDistance(
              DEFAULT_LOCATION.latitude,
              DEFAULT_LOCATION.longitude,
              product.seller.location_lat,
              product.seller.location_long
            );
          }
          return {
            ...product,
            distance,
          } as ProductWithSeller & { distance: number };
        });

        setProducts(productsWithDistance);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<ProductInsert, 'seller_id'>) => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const productInsert: ProductInsert = {
        ...productData,
        seller_id: user.id,
        status: 'active',
        view_count: 0,
        favorite_count: 0,
        // Add the new fields
        payment_methods: productData.payment_methods || [],
        other_payment_method: productData.other_payment_method || null,
        pickup_instructions: productData.pickup_instructions || null,
        pickup_latitude: productData.pickup_latitude || null,
        pickup_longitude: productData.pickup_longitude || null,
        is_residential: productData.is_residential !== undefined ? productData.is_residential : true,
        latitude: productData.latitude || null,
        longitude: productData.longitude || null,
        verification_status: productData.verification_status || 'manual_review',
        verification_confidence: productData.verification_confidence ?? null,
        verification_ripeness_score: productData.verification_ripeness_score ?? null,
        verification_notes: productData.verification_notes || null,
        verification_metadata: productData.verification_metadata || null,
        verification_requested_at: productData.verification_requested_at || new Date().toISOString(),
        verification_completed_at: productData.verification_completed_at || null,
      };

      console.log('Attempting to insert product:', productInsert);

      const { data, error } = await supabase
        .from('products')
        .insert([productInsert])
        .select(`
          *,
          seller:users!products_seller_id_fkey (
            id,
            email,
            name,
            profile_pic_url,
            bio,
            location_lat,
            location_long,
            address,
            seller_rating,
            review_count,
            is_verified_seller,
            phone,
            follower_count,
            following_count,
            created_at,
            last_active,
            updated_at
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (data) {
        console.log('Product created successfully:', data);
        const newProduct = data as ProductWithSeller;

        // Calculate distance for the new product
        let distance = 0;
        if (newProduct.seller?.location_lat && newProduct.seller?.location_long) {
          distance = calculateDistance(
            DEFAULT_LOCATION.latitude,
            DEFAULT_LOCATION.longitude,
            newProduct.seller.location_lat,
            newProduct.seller.location_long
          );
        }

        const productWithDistance = {
          ...newProduct,
          distance,
        } as ProductWithSeller & { distance: number };

        // Add to local state for immediate UI update
        setProducts(prev => [productWithDistance, ...prev]);
        setNewProductId(newProduct.id);
        
        // Clear the new product ID after 3 seconds
        setTimeout(() => {
          setNewProductId(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const clearNewProductId = () => {
    setNewProductId(null);
  };

  const loadUriAsUint8Array = async (localUri: string): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localUri);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 0) {
          resolve(new Uint8Array(xhr.response));
        } else {
          reject(new Error(`Failed to load file: status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Failed to load file'));
      xhr.send();
    });
  };

  const uploadImage = async (localUri: string, options?: { folder?: string }): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get file extension
      const fileExtension = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
      const folder = options?.folder ? options.folder.replace(/\/+$/g, '') : 'product-images';
      const filePath = `${folder}/${fileName}`;

      // For React Native, we need to use XMLHttpRequest to load the file as ArrayBuffer
      // since fetch().blob() is not available in React Native
      const fileArray = await loadUriAsUint8Array(localUri);

      // Upload to Supabase Storage (using the same "posts" bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, fileArray, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Upload error message:', uploadError.message);
        
        // Provide helpful error message
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
          throw new Error('Storage permission error. Please ensure the storage bucket "posts" exists and RLS policies are configured. See database/setup_storage.sql');
        }
        
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const uploadVideo = async (
    localUri: string,
    options?: { folder?: string; defaultExtension?: string; contentType?: string },
  ): Promise<{ publicUrl: string; storagePath: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const resolveExtension = (uri: string, fallback: string) => {
        const sanitized = uri.split('?')[0]?.split('#')[0] ?? '';
        const ext = sanitized.split('.').pop();
        return ext ? ext.toLowerCase() : fallback;
      };

      const extension = resolveExtension(localUri, options?.defaultExtension ?? 'mp4');
      const folder = options?.folder ? options.folder.replace(/\/+$/g, '') : 'product-verification/videos';
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
      const filePath = `${folder}/${fileName}`;

      const mimeType = (() => {
        if (options?.contentType) return options.contentType;
        switch (extension) {
          case 'mov':
            return 'video/quicktime';
          case 'mp4':
            return 'video/mp4';
          case 'm4v':
            return 'video/x-m4v';
          case 'webm':
            return 'video/webm';
          default:
            return 'video/mp4';
        }
      })();

      const fileArray = await loadUriAsUint8Array(localUri);

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, fileArray, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload video error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);

      return { publicUrl: urlData.publicUrl, storagePath: filePath };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  };

  const classifyFreshStale = async (imageUri: string): Promise<{ isFresh: boolean; confidence: number }> => {
    try {
      // Upload image first
      const imageUrl = await uploadImage(imageUri, { folder: 'freshness-check' });
      console.log('Image uploaded, URL:', imageUrl);

      // Call the fresh/stale classification API
      const { data, error } = await supabase.functions.invoke('classify-fresh-stale', {
        body: {
          imageUrl,
        },
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Classification error:', error);
        throw new Error(error.message || 'Failed to classify produce freshness');
      }

      if (!data) {
        throw new Error('No classification data returned');
      }

      // Check if response has error field (from Edge Function error response)
      if (data.error) {
        console.error('Edge Function returned error:', data);
        throw new Error(data.details || data.error || 'Classification failed');
      }

      return {
        isFresh: data.isFresh ?? false,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      };
    } catch (err) {
      console.error('Error classifying fresh/stale:', err);
      throw err;
    }
  };

  const verifyProduce = async (params: {
    productTitle: string;
    category?: string;
    productId?: string;
    images: VerificationImageInput[];
    video?: VerificationVideoInput | null;
    captureMethod?: 'guided_video' | 'manual_photos';
  }): Promise<VerificationResult> => {
    const { productTitle, category, images, productId } = params;

    if (!images || images.length === 0) {
      throw new Error('Please capture images of the product before verification.');
    }

    try {
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          const publicUrl = await uploadImage(image.uri, { folder: 'product-verification' });
          return { angle: image.angle, url: publicUrl };
        }),
      );

      let uploadedVideo: { url: string; durationMs?: number | null; storagePath: string } | null = null;

      if (params.video?.uri) {
        const videoUpload = await uploadVideo(params.video.uri, { folder: 'product-verification/videos' });
        uploadedVideo = {
          url: videoUpload.publicUrl,
          storagePath: videoUpload.storagePath,
          durationMs: params.video.durationMs ?? null,
        };
      }

      const { data, error } = await supabase.functions.invoke('verify-produce', {
        body: {
          productId: productId ?? null,
          claimedName: productTitle,
          claimedCategory: category ?? null,
          images: uploadedImages,
          video: uploadedVideo
            ? {
                url: uploadedVideo.url,
                storagePath: uploadedVideo.storagePath,
                durationMs: uploadedVideo.durationMs,
              }
            : null,
          captureMethod: params.captureMethod ?? (uploadedVideo ? 'guided_video' : 'manual_photos'),
        },
      });

      if (error) {
        console.error('Verification error:', error);
        throw new Error(error.message || 'Failed to verify produce');
      }

      if (!data) {
        throw new Error('No verification data returned');
      }

      const mappedStatus = (data.status ?? 'manual_review') as ProductVerificationStatus;

      return {
        status: mappedStatus,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        ripenessScore: typeof data.ripenessScore === 'number' ? data.ripenessScore : 0,
        matchedProduct: data.matchedProduct ?? null,
        notes: Array.isArray(data.notes) ? data.notes : [],
        metadata: data.metadata ?? undefined,
      };
    } catch (err) {
      console.error('Error running produce verification:', err);
      throw err;
    }
  };

  return (
    <MarketplaceContext.Provider value={{ products, addProduct, loadProducts, newProductId, clearNewProductId, loading, uploadImage, verifyProduce, classifyFreshStale }}>
      {children}
    </MarketplaceContext.Provider>
  );
};
