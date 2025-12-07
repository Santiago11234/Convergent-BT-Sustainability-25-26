# HomeGrown - Sustainable Marketplace Platform

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0.20-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.76.0-3ECF8E?logo=supabase)](https://supabase.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.20.0-FF6F00?logo=tensorflow)](https://www.tensorflow.org/)
[![Stripe](https://img.shields.io/badge/Stripe-14.21.0-635BFF?logo=stripe)](https://stripe.com/)

A comprehensive mobile-first marketplace platform connecting local farmers, producers, and consumers through a sustainable food ecosystem. Built with React Native, powered by Supabase, and enhanced with AI-driven produce verification using TensorFlow.

##  Project Overview

HomeGrown is a full-stack mobile application that enables users to buy, sell, and share locally-sourced produce. The platform integrates machine learning for automated produce quality verification, real-time social features, and secure payment processing through Stripe Connect.

### Key Features

- **AI-Powered Produce Verification**: TensorFlow MobileNetV2 model trained on Kaggle dataset for fresh/stale classification
- **Real-time Marketplace**: Buy and sell local produce with geolocation-based search
- **Social Feed**: Share posts, stories, and engage with community content
- **Community Building**: Create and join communities around sustainable farming
- **Secure Payments**: Stripe Connect integration for marketplace transactions
- **Messaging System**: Direct communication between buyers and sellers
- **Profile Management**: Comprehensive user profiles with ratings and verification

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│  React Native (Expo) + TypeScript + NativeWind (Tailwind)   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──────────────────────────────────────────┐
                  │                                          │
┌─────────────────▼──────────────────┐    ┌─────────────────▼──────────────────┐
│      Supabase Backend              │    │   TensorFlow ML API                │
│  • PostgreSQL Database             │    │   • FastAPI Service                │
│  • Row Level Security (RLS)        │    │   • MobileNetV2 Model              │
│  • Real-time Subscriptions         │    │   • Fresh/Stale Classification     │
│  • Edge Functions (Deno)           │    │   • Deployed on Railway             │
│  • Storage Buckets                 │    │                                    │
└─────────────────┬──────────────────┘    └────────────────────────────────────┘
                  │
                  ├──────────────────────────────────────────┐
                  │                                          │
┌─────────────────▼──────────────────┐    ┌─────────────────▼──────────────────┐
│      Stripe Integration            │    │   External Services                │
│  • Payment Intents API             │    │   • Google Maps API                │
│  • Connect Accounts                │    │   • Image Storage (Supabase)       │
│  • Webhook Handlers                │    │   • Real-time Notifications        │
│  • Onboarding Flow                 │    │                                    │
└────────────────────────────────────┘    └────────────────────────────────────┘
```

##  Machine Learning Model

### TensorFlow MobileNetV2 Classification Model

The platform uses a **MobileNetV2** architecture fine-tuned for binary classification of produce freshness. The model was trained on the [Fresh and Stale Classification dataset](https://www.kaggle.com/datasets/swoyam2609/fresh-and-stale-classification) from Kaggle.

#### Model Architecture

```python
Base Model: MobileNetV2 (ImageNet pretrained)
├── Input: (224, 224, 3) RGB images
├── Preprocessing: MobileNetV2 standard preprocessing (normalized to [-1, 1])
├── Feature Extraction: Frozen MobileNetV2 base (transfer learning)
├── Global Average Pooling: Reduces spatial dimensions
├── Dropout: 0.3 (regularization)
└── Output: Dense(1, sigmoid) → Binary classification (fresh/stale)
```

#### Training Details

- **Dataset**: Kaggle Fresh and Stale Classification dataset
- **Data Augmentation**: Random horizontal flips, rotations (±10%), zoom (±10%)
- **Train/Val/Test Split**: Standard 80/10/10 split
- **Optimizer**: Adam (learning rate: 1e-3)
- **Loss Function**: Binary crossentropy
- **Metrics**: Accuracy
- **Callbacks**: Early stopping (patience=3), Model checkpointing
- **Final Performance**: 94.15% test accuracy, 0.146 test loss

#### Model Deployment

The trained model is deployed as a **FastAPI service** on Railway:

- **Endpoint**: `POST /classify`
- **Input**: `{ "imageUrl": "https://..." }`
- **Output**: `{ "isFresh": bool, "confidence": float, "model": "fresh-stale-classifier" }`
- **Preprocessing**: Images are resized to 224x224, normalized using MobileNetV2 preprocessing
- **Inference**: Model outputs sigmoid probability (0=fresh, 1=stale)

#### Integration Flow

```
Mobile App → Supabase Edge Function → FastAPI ML Service → TensorFlow Model → Response
```

The Supabase Edge Function (`classify-fresh-stale`) acts as a proxy, calling the deployed FastAPI service and handling error cases gracefully.

##  Frontend Technology Stack

### Core Framework

- **React Native 0.81.5**: Cross-platform mobile development
- **Expo SDK 54**: Development toolchain and runtime
- **TypeScript 5.9.2**: Type-safe development
- **Expo Router 6.0.13**: File-based routing with deep linking

### UI/UX Libraries

- **NativeWind 4.2.1**: Tailwind CSS for React Native
- **Tailwind CSS 3.4.18**: Utility-first styling
- **React Native Reanimated 4.1.1**: Smooth animations
- **React Native Gesture Handler 2.28.0**: Touch gesture handling

### State Management & Data Fetching

- **React Context API**: Global state management
  - `AuthContext`: User authentication and session management
  - `MarketplaceContext`: Product listings and marketplace state
  - `FeedContext`: Social feed posts and interactions
  - `CommunityContext`: Community management and membership
  - `FollowContext`: User follow/unfollow functionality

### Native Features

- **Expo Camera 17.0.9**: Image/video capture for produce verification
- **Expo Location 19.0.7**: Geolocation for distance-based search
- **React Native Maps 1.20.1**: Interactive maps for pickup locations
- **Expo Image Picker 17.0.8**: Media selection from device
- **Expo File System 19.0.17**: File operations and uploads
- **Expo Haptics 15.0.7**: Tactile feedback

### Payment Integration

- **@stripe/stripe-react-native 0.57.0**: Stripe SDK for React Native
- Secure payment processing with Stripe Connect for marketplace transactions

##  Backend Technology Stack

### Database: Supabase PostgreSQL

**PostgreSQL** with PostGIS extension for geospatial queries:

#### Core Tables

- **`users`**: Extended Supabase auth with profile data, ratings, Stripe account IDs
- **`products`**: Marketplace listings with images, pricing, inventory, verification status
- **`posts`**: Unified content table (blog posts, videos, images)
- **`comments`**: Nested comment system with replies
- **`transactions`**: Payment records with Stripe integration
- **`communities`**: Community groups and memberships
- **`conversations`** & **`messages`**: Real-time messaging system
- **`follows`**: Social graph for user connections
- **`reviews`**: Seller rating system

#### Database Features

- **Row Level Security (RLS)**: Fine-grained access control
- **Real-time Subscriptions**: PostgreSQL change streams via Supabase Realtime
- **Triggers**: Automatic count updates (likes, comments, followers)
- **Indexes**: Optimized queries for location, search, and relationships
- **Foreign Keys**: Referential integrity with cascade deletes

### Edge Functions: Deno Runtime

Supabase Edge Functions written in **TypeScript/Deno**:

1. **`classify-fresh-stale`**: Proxies requests to TensorFlow ML API
2. **`verify-produce`**: Multi-angle produce verification workflow
3. **`create-payment-intent`**: Stripe Payment Intent creation with Connect
4. **`stripe-webhook`**: Webhook handler for payment events
5. **`create-connect-account`**: Stripe Connect account onboarding
6. **`check-onboarding-status`**: Stripe Connect status verification
7. **`stripe-redirect`**: OAuth redirect handler for Connect flow
8. **`reset-stripe-account`**: Account reset utility

### Storage: Supabase Storage

- **Image Buckets**: Product images, post media, profile pictures
- **Video Buckets**: Video posts and guided verification videos
- **RLS Policies**: Secure access control for storage objects

##  Payment Processing: Stripe Integration

### Stripe Connect Implementation

The platform uses **Stripe Connect** to enable marketplace payments:

#### Architecture

```
Buyer → Payment Intent → Stripe → Connected Account (Seller) → Payout
```

#### Key Components

1. **Seller Onboarding**
   - Stripe Connect account creation via `create-connect-account`
   - OAuth flow for account verification
   - Onboarding status tracking in database

2. **Payment Processing**
   - Payment Intents with destination charges
   - Platform fee calculation (configurable percentage)
   - Automatic seller payout via Stripe transfers

3. **Webhook Handling**
   - `payment_intent.succeeded`: Update transaction status, decrement inventory
   - `payment_intent.failed`: Mark transaction as failed
   - `account.updated`: Update seller verification status
   - `charge.refunded`: Restore inventory, update transaction

#### Database Schema

```sql
-- Users table
stripe_customer_id TEXT        -- Buyer Stripe customer ID
stripe_account_id TEXT         -- Seller Stripe Connect account ID
stripe_onboarding_complete BOOLEAN

-- Transactions table
stripe_payment_intent_id TEXT   -- Payment Intent reference
stripe_transfer_id TEXT         -- Transfer ID for seller payout
seller_payout_amount DECIMAL    -- Amount seller receives after fees
```

##  Application Features

### Marketplace

- **Product Listings**: Rich product cards with images, pricing, inventory
- **Advanced Search**: Full-text search with category filters
- **Distance-based Filtering**: Location-aware product discovery
- **Price Range Filtering**: Dynamic price range sliders
- **Seller Profiles**: Verified seller badges, ratings, reviews
- **Inventory Management**: Real-time stock updates
- **Product Verification**: AI-powered freshness classification

### Social Feed

- **Multi-format Posts**: Blog posts, images, videos
- **Engagement**: Likes, comments with nested replies
- **Real-time Updates**: Live like/comment counts via Supabase Realtime
- **Sharing**: Native share functionality
- **User Mentions**: Profile linking in comments

### Communities

- **Community Creation**: Custom communities with categories
- **Membership Management**: Join/leave functionality
- **Community Channels**: Organized discussion spaces
- **Member Discovery**: Suggested members based on activity

### Messaging

- **Direct Messages**: One-on-one conversations
- **Real-time Chat**: Instant message delivery
- **Media Sharing**: Image attachments in messages
- **Conversation Management**: Message history and threading

### User Profiles

- **Comprehensive Profiles**: Bio, location, contact information
- **Social Stats**: Followers, following, ratings
- **Content Tabs**: Posts and active listings
- **Suggested Users**: Algorithm-based user recommendations
- **Follow System**: Social graph with real-time updates

##  Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI**: `npm install -g expo-cli`
- **Python** 3.10+ (for ML model training)
- **Supabase Account**: [supabase.com](https://supabase.com)
- **Stripe Account**: [stripe.com](https://stripe.com)
- **Kaggle API**: For dataset download (optional)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Convergent-BT-Sustainability-25-26.git
cd Convergent-BT-Sustainability-25-26
```

#### 2. Frontend Setup

```bash
cd sustainability
npm install
```

#### 3. Environment Configuration

Create `.env` file in `sustainability/`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4. Backend Setup (Supabase)

1. Create a new Supabase project
2. Run database migrations from `sustainability/database/`
3. Set up storage buckets: `posts`, `products`, `profiles`
4. Deploy Edge Functions from `sustainability/supabase/functions/`

#### 5. ML Model Setup

```bash
cd fresh-stale-api
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Train the model** (optional, uses pretrained weights by default):

```bash
# Download Kaggle dataset
python train_from_kaggle.py

# Or train with local data
python train_model.py --data_dir data/raw/dataset_split --epochs 12
```

#### 6. Deploy ML API

Deploy to Railway, Render, or similar:

```bash
# Set environment variables
MODEL_PATH=best_model.h5
PORT=8000

# Deploy
railway up  # or use your preferred platform
```

Update Supabase Edge Function secret:

```bash
supabase secrets set MODEL_API_URL=https://your-api.railway.app
```

#### 7. Stripe Configuration

1. Create Stripe account and get API keys
2. Set up Stripe Connect
3. Configure webhook endpoint: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
4. Set Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Running the Application

```bash
# Start Expo development server
cd sustainability
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

##  Database Schema

### Key Relationships

```
users (1) ──< (N) products
users (1) ──< (N) posts
users (1) ──< (N) comments
users (N) ──< (N) follows (many-to-many)
products (1) ──< (N) transactions
posts (1) ──< (N) comments
communities (1) ──< (N) community_members
```

### Indexes

- **Geospatial**: `location_lat`, `location_long` for distance queries
- **Full-text Search**: GIN indexes on `products.title`, `products.description`
- **Foreign Keys**: All relationship columns indexed
- **Stripe IDs**: Indexed for fast payment lookups

##  API Endpoints

### Supabase Edge Functions

#### `POST /functions/v1/classify-fresh-stale`
Classify produce freshness using ML model.

**Request:**
```json
{
  "imageUrl": "https://..."
}
```

**Response:**
```json
{
  "isFresh": true,
  "confidence": 0.95,
  "model": "fresh-stale-classifier"
}
```

#### `POST /functions/v1/verify-produce`
Multi-angle produce verification.

**Request:**
```json
{
  "productId": "uuid",
  "images": [
    { "angle": "front", "url": "..." },
    { "angle": "back", "url": "..." },
    ...
  ],
  "video": { "url": "...", "durationMs": 5000 }
}
```

#### `POST /functions/v1/create-payment-intent`
Create Stripe Payment Intent for transaction.

**Request:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

#### `POST /functions/v1/create-connect-account`
Initialize Stripe Connect onboarding.

### ML API (FastAPI)

#### `POST /classify`
Classify image as fresh or stale.

**Request:**
```json
{
  "imageUrl": "https://..."
}
```

**Response:**
```json
{
  "isFresh": true,
  "confidence": 0.94,
  "model": "fresh-stale-classifier"
}
```

##  Testing

### Frontend Testing

```bash
cd sustainability
npm run lint
```

### ML Model Testing

```bash
cd fresh-stale-api
python test_local.py
```

### API Testing

```bash
# Test ML API
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

##  Deployment

### Mobile App

- **iOS**: Build with EAS Build or Xcode
- **Android**: Build with EAS Build or Android Studio
- **Web**: Deploy to Vercel, Netlify, or similar

### Backend (Supabase)

- **Database**: Managed by Supabase
- **Edge Functions**: Deploy via Supabase CLI
- **Storage**: Configured in Supabase dashboard

### ML API

- **Railway**: Automatic deployment from GitHub
- **Render**: Use `render.yaml` configuration
- **Docker**: Containerized deployment supported

##  Security

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Supabase Auth with refresh tokens
- **API Key Management**: Environment-based secrets
- **Stripe Webhook Verification**: Signature validation
- **Input Validation**: Pydantic models for API requests
- **SQL Injection Prevention**: Parameterized queries via Supabase client

##  Performance Optimizations

- **Image Optimization**: Expo Image with caching
- **Lazy Loading**: Code splitting with Expo Router
- **Real-time Efficiency**: Selective Supabase subscriptions
- **Database Indexing**: Optimized queries for common operations
- **Model Caching**: ML model loaded once on API startup
- **CDN**: Supabase Storage CDN for media delivery

##  Development Tools

- **TypeScript**: Type safety across codebase
- **ESLint**: Code quality and consistency
- **Expo Dev Tools**: Hot reload and debugging
- **Supabase Studio**: Database management UI
- **Stripe Dashboard**: Payment monitoring

##  License

This project is licensed under the MIT License.

##  Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting PRs.

##  Contact

For questions or support, please open an issue on GitHub.

---

**Built with love for sustainable agriculture**

