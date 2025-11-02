import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductInsert, ProductWithSeller } from '@/types';
import { User } from '@/types';
import { calculateDistance, DEFAULT_LOCATION } from '@/utils/distance';

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
  uploadImage: (localUri: string) => Promise<string>; // Uploads image and returns public URL
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

  const uploadImage = async (localUri: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get file extension
      const fileExtension = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
      const filePath = `product-images/${fileName}`;

      // For React Native, we need to use XMLHttpRequest to load the file as ArrayBuffer
      // since fetch().blob() is not available in React Native
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localUri);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Failed to load file: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Failed to load file'));
        xhr.send();
      });

      // Convert ArrayBuffer to Uint8Array for Supabase
      const fileArray = new Uint8Array(fileData);

      // Upload to Supabase Storage (using the same "posts" bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, fileArray, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
        });
        
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

  return (
    <MarketplaceContext.Provider value={{ products, addProduct, loadProducts, newProductId, clearNewProductId, loading, uploadImage }}>
      {children}
    </MarketplaceContext.Provider>
  );
};
