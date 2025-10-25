import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductWithSeller, ProductCategory } from '@/types';
import { calculateDistance, DEFAULT_LOCATION } from '@/utils/distance';

export interface ProductFilters {
  category?: ProductCategory | 'All';
  minPrice?: number;
  maxPrice?: number;
  maxDistance?: number; // in miles
  searchQuery?: string;
  userLat?: number;
  userLong?: number;
}

export interface UseProductsResult {
  products: (ProductWithSeller & { distance: number })[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProducts(filters: ProductFilters = {}): UseProductsResult {
  const [products, setProducts] = useState<(ProductWithSeller & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase
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
        .eq('status', 'active'); // Only show active products

      // Filter by category
      if (filters.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }

      // Filter by price range
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }

      // Search filter (searches in title and description)
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        query = query.or(
          `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
        );
      }

      // Execute the query
      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (!data) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Calculate distances and filter by distance if needed
      const userLat = filters.userLat || DEFAULT_LOCATION.latitude;
      const userLong = filters.userLong || DEFAULT_LOCATION.longitude;

      const productsWithDistance = data
        .map((product) => {
          // Calculate distance if seller has location data
          let distance = 0;
          if (product.seller?.location_lat && product.seller?.location_long) {
            distance = calculateDistance(
              userLat,
              userLong,
              product.seller.location_lat,
              product.seller.location_long
            );
          }

          return {
            ...product,
            seller: product.seller,
            distance,
          } as ProductWithSeller & { distance: number };
        })
        .filter((product) => {
          // Filter by max distance if specified
          if (filters.maxDistance !== undefined) {
            return product.distance <= filters.maxDistance;
          }
          return true;
        })
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      setProducts(productsWithDistance);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDistance,
    filters.searchQuery,
    filters.userLat,
    filters.userLong,
  ]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}
