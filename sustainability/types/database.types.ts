/**
 * Database Types for Farming Marketplace
 * Auto-generated from Supabase schema
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ProductStatus = 'active' | 'sold_out' | 'archived';
export type ProductVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'manual_review'
  | 'failed';

export type ProductCategory =
  | 'vegetables'
  | 'fruits'
  | 'eggs'
  | 'honey'
  | 'herbs'
  | 'dairy'
  | 'meat'
  | 'flowers'
  | 'preserves'
  | 'other';

export type UnitOfMeasure = 'lbs' | 'oz' | 'count' | 'bunches' | 'dozen' | 'pint' | 'quart' | 'gallon' | 'each';

export type GrowingMethod = 'organic' | 'conventional' | 'hydroponic' | 'aquaponic' | 'permaculture';

export type DeliveryOption = 'pickup' | 'local_delivery' | 'shipping';

export type PostType = 'blog' | 'short_video' | 'long_video' | 'image' | 'video';

export type PostStatus = 'draft' | 'published' | 'archived';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export type PaymentMethod = 'cash' | 'venmo' | 'paypal' | 'stripe' | 'zelle' | 'other';

export type NotificationType = 'like' | 'comment' | 'follow' | 'purchase' | 'message' | 'review' | 'sale';

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface User {
  id: string; // UUID from auth.users
  email: string;
  name: string;
  profile_pic_url: string | null;
  bio: string | null;
  location_lat: number | null;
  location_long: number | null;
  address: string | null;
  seller_rating: number;
  review_count: number;
  is_verified_seller: boolean;
  is_seller: boolean; // Whether user is primarily a seller
  has_set_role: boolean; // Whether user has selected their role
  phone: string | null;
  follower_count: number;
  following_count: number;
  created_at: string; // ISO timestamp
  last_active: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Product {
  id: string; // UUID
  seller_id: string; // UUID reference to User
  title: string;
  description: string | null;
  price: number; // Decimal as number
  quantity_available: number;
  unit_of_measure: UnitOfMeasure | string;
  category: ProductCategory | string;
  tags: string[];
  is_organic: boolean;
  growing_method: GrowingMethod | string | null;
  available_from: string | null; // ISO date
  available_to: string | null; // ISO date
  pickup_location: string | null;
  delivery_options: DeliveryOption[] | string[];
  status: ProductStatus;
  images: string[]; // Array of URLs
  view_count: number;
  favorite_count: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  // New fields added for create-post functionality
  payment_methods: string[];
  other_payment_method: string | null;
  pickup_instructions: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  is_residential: boolean;
  latitude: number | null;
  longitude: number | null;
  verification_status: ProductVerificationStatus | null;
  verification_confidence: number | null;
  verification_ripeness_score: number | null;
  verification_notes: string[] | null;
  verification_metadata: Record<string, any> | null;
  verification_requested_at: string | null;
  verification_completed_at: string | null;
}

export interface Post {
  id: string; // UUID
  author_id: string; // UUID reference to User
  post_type: PostType;
  title: string;
  description: string | null;

  // Blog specific
  content_markdown: string | null;
  images: string[]; // For blog images

  // Video specific
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;

  tags: string[];
  status: PostStatus;
  is_featured: boolean;
  like_count: number;
  view_count: number;
  comment_count: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Comment {
  id: string; // UUID
  user_id: string; // UUID reference to User
  post_id: string; // UUID reference to Post
  parent_comment_id: string | null; // UUID reference to Comment (for replies)
  text: string;
  like_count: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface PostLike {
  id: string; // UUID
  user_id: string; // UUID reference to User
  post_id: string; // UUID reference to Post
  created_at: string; // ISO timestamp
}

export interface ProductFavorite {
  id: string; // UUID
  user_id: string; // UUID reference to User
  product_id: string; // UUID reference to Product
  created_at: string; // ISO timestamp
}

export interface Follow {
  id: string; // UUID
  follower_id: string; // UUID reference to User
  following_id: string; // UUID reference to User
  created_at: string; // ISO timestamp
}

export interface Transaction {
  id: string; // UUID
  transaction_id: string; // Human-readable ID
  buyer_id: string; // UUID reference to User
  seller_id: string; // UUID reference to User
  product_id: string; // UUID reference to Product
  quantity: number;
  unit_price: number; // Decimal as number
  total_amount: number; // Decimal as number
  status: TransactionStatus;
  payment_method: PaymentMethod | string | null;
  pickup_time: string | null; // ISO timestamp
  delivery_time: string | null; // ISO timestamp
  delivery_method: string | null;
  transaction_notes: string | null;
  created_at: string; // ISO timestamp
  completed_at: string | null; // ISO timestamp
}

export interface Review {
  id: string; // UUID
  reviewer_id: string; // UUID reference to User
  seller_id: string; // UUID reference to User
  transaction_id: string | null; // UUID reference to Transaction
  rating: number; // 1-5
  comment: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Conversation {
  id: string; // UUID
  participant_1_id: string; // UUID reference to User
  participant_2_id: string; // UUID reference to User
  last_message_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
}

export interface Message {
  id: string; // UUID
  conversation_id: string; // UUID reference to Conversation
  sender_id: string; // UUID reference to User
  text: string;
  is_read: boolean;
  created_at: string; // ISO timestamp
}

export interface Notification {
  id: string; // UUID
  user_id: string; // UUID reference to User
  type: NotificationType | string;
  title: string;
  content: string | null;
  link: string | null; // Deep link
  is_read: boolean;
  created_at: string; // ISO timestamp
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type UserInsert = Omit<
  User,
  'seller_rating' | 'review_count' | 'follower_count' | 'following_count' | 'created_at' | 'last_active' | 'updated_at'
> &
  Partial<Pick<User, 'seller_rating' | 'review_count' | 'follower_count' | 'following_count'>>;

export type ProductInsert = Omit<Product, 'id' | 'view_count' | 'favorite_count' | 'created_at' | 'updated_at'> &
  Partial<Pick<Product, 'id' | 'view_count' | 'favorite_count'>>;

export type PostInsert = Omit<Post, 'id' | 'like_count' | 'view_count' | 'comment_count' | 'created_at' | 'updated_at'> &
  Partial<Pick<Post, 'id' | 'like_count' | 'view_count' | 'comment_count'>>;

export type CommentInsert = Omit<Comment, 'id' | 'like_count' | 'created_at' | 'updated_at'> &
  Partial<Pick<Comment, 'id' | 'like_count'>>;

export type PostLikeInsert = Omit<PostLike, 'id' | 'created_at'> & Partial<Pick<PostLike, 'id'>>;

export type ProductFavoriteInsert = Omit<ProductFavorite, 'id' | 'created_at'> & Partial<Pick<ProductFavorite, 'id'>>;

export type FollowInsert = Omit<Follow, 'id' | 'created_at'> & Partial<Pick<Follow, 'id'>>;

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'completed_at'> &
  Partial<Pick<Transaction, 'id' | 'completed_at'>>;

export type ReviewInsert = Omit<Review, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Review, 'id'>>;

export type ConversationInsert = Omit<Conversation, 'id' | 'last_message_at' | 'created_at'> &
  Partial<Pick<Conversation, 'id' | 'last_message_at'>>;

export type MessageInsert = Omit<Message, 'id' | 'created_at'> & Partial<Pick<Message, 'id'>>;

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'> & Partial<Pick<Notification, 'id'>>;

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>;

export type ProductUpdate = Partial<Omit<Product, 'id' | 'seller_id' | 'created_at'>>;

export type PostUpdate = Partial<Omit<Post, 'id' | 'author_id' | 'created_at'>>;

export type CommentUpdate = Partial<Omit<Comment, 'id' | 'user_id' | 'post_id' | 'created_at'>>;

export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'transaction_id' | 'buyer_id' | 'seller_id' | 'product_id' | 'created_at'>>;

export type ReviewUpdate = Partial<Omit<Review, 'id' | 'reviewer_id' | 'seller_id' | 'transaction_id' | 'created_at'>>;

export type MessageUpdate = Partial<Omit<Message, 'id' | 'conversation_id' | 'sender_id' | 'created_at'>>;

export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'user_id' | 'created_at'>>;

// ============================================================================
// JOINED/EXTENDED TYPES (with relations)
// ============================================================================

export interface ProductWithSeller extends Product {
  seller: User;
}

export interface PostWithAuthor extends Post {
  author: User;
}

export interface CommentWithUser extends Comment {
  user: User;
  replies?: CommentWithUser[]; // Nested replies
}

export interface TransactionWithDetails extends Transaction {
  buyer: User;
  seller: User;
  product: Product;
}

export interface ReviewWithUser extends Review {
  reviewer: User;
}

export interface MessageWithSender extends Message {
  sender: User;
}

export interface ConversationWithDetails extends Conversation {
  participant_1: User;
  participant_2: User;
  last_message?: Message;
  unread_count?: number;
}

// ============================================================================
// RESPONSE TYPES (for API responses)
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface ProductListResponse extends PaginatedResponse<ProductWithSeller> {}

export interface PostListResponse extends PaginatedResponse<PostWithAuthor> {}

export interface TransactionListResponse extends PaginatedResponse<TransactionWithDetails> {}

export interface ReviewListResponse extends PaginatedResponse<ReviewWithUser> {}

// ============================================================================
// FILTER TYPES (for search/filtering)
// ============================================================================

export interface ProductFilters {
  category?: ProductCategory | string;
  min_price?: number;
  max_price?: number;
  seller_id?: string;
  status?: ProductStatus;
  is_organic?: boolean;
  tags?: string[];
  search?: string;
  delivery_options?: DeliveryOption[];
  // Location-based
  lat?: number;
  long?: number;
  radius_miles?: number;
}

export interface PostFilters {
  post_type?: PostType;
  author_id?: string;
  tags?: string[];
  status?: PostStatus;
  is_featured?: boolean;
  search?: string;
}

export interface TransactionFilters {
  buyer_id?: string;
  seller_id?: string;
  status?: TransactionStatus;
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// SUPABASE DATABASE TYPE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
      post_likes: {
        Row: PostLike;
        Insert: PostLikeInsert;
        Update: never;
      };
      product_favorites: {
        Row: ProductFavorite;
        Insert: ProductFavoriteInsert;
        Update: never;
      };
      follows: {
        Row: Follow;
        Insert: FollowInsert;
        Update: never;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
      };
      reviews: {
        Row: Review;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: never;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: MessageUpdate;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
    };
  };
}
