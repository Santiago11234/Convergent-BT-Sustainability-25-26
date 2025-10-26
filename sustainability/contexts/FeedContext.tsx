import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';

interface FeedContextType {
  posts: Post[];
  loading: boolean;
  createPost: (postData: Omit<Post, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'like_count' | 'view_count' | 'comment_count' | 'status'>) => Promise<void>;
  refreshPosts: () => Promise<void>;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
};

export const FeedProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_author_id_fkey (
            id,
            name,
            email,
            profile_pic_url,
            bio
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
        return;
      }

      if (data) {
        console.log('Loaded posts:', data);
        setPosts(data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: Omit<Post, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'like_count' | 'view_count' | 'comment_count' | 'status'>) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const postInsert = {
        ...postData,
        author_id: user.id,
        status: 'published',
        like_count: 0,
        view_count: 0,
        comment_count: 0,
      };

      console.log('Creating post:', postInsert);

      const { data, error } = await supabase
        .from('posts')
        .insert([postInsert])
        .select(`
          *,
          users!posts_author_id_fkey (
            id,
            name,
            email,
            profile_pic_url,
            bio
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (data) {
        console.log('Post created successfully:', data);
        // Add to local state for immediate UI update
        setPosts(prev => [data, ...prev]);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const refreshPosts = async () => {
    await loadPosts();
  };

  return (
    <FeedContext.Provider value={{ posts, loading, createPost, refreshPosts }}>
      {children}
    </FeedContext.Provider>
  );
};

