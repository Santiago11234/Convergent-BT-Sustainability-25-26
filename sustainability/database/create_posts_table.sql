-- Create posts table for the marketplace
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  images TEXT[], -- Array of image URLs
  tags TEXT[], -- Array of tags
  organic BOOLEAN DEFAULT FALSE,
  available_quantity VARCHAR(100),
  seller VARCHAR(100) NOT NULL,
  distance DECIMAL(5,2) DEFAULT 0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_residential BOOLEAN DEFAULT TRUE,
  pickup_point VARCHAR(255),
  pickup_instructions TEXT,
  pickup_latitude DECIMAL(10,8),
  pickup_longitude DECIMAL(11,8),
  image VARCHAR(255) DEFAULT '🌱',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Create an index on category for filtering
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Create an index on location for distance calculations
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(latitude, longitude);
