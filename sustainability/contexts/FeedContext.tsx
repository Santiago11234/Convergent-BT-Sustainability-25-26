import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Post, Comment } from '@/types';

interface FeedContextType {
  posts: Post[];
  loading: boolean;
  createPost: (postData: Omit<Post, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'like_count' | 'view_count' | 'comment_count' | 'status'>) => Promise<void>;
  refreshPosts: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  getPostLikes: (postId: string) => Promise<string[]>; // Returns array of user IDs who liked
  getPostComments: (postId: string) => Promise<Comment[]>;
  addComment: (postId: string, text: string) => Promise<void>;
  uploadImage: (localUri: string) => Promise<string>; // Uploads image and returns public URL
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

    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: 'status=eq.published',
        },
        (payload) => {
          console.log('Posts change received:', payload);
          if (payload.eventType === 'INSERT') {
            // Fetch the full post with user data
            loadSinglePost(payload.new.id as string);
          } else if (payload.eventType === 'UPDATE') {
            // Update the post in local state
            setPosts((prev) =>
              prev.map((post) =>
                post.id === payload.new.id
                  ? { ...post, ...payload.new }
                  : post
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        (payload) => {
          console.log('Likes change received:', payload);
          // Update the post's like_count - triggers will handle the count, but we reload to get accurate counts
          loadPosts();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          console.log('Comments change received:', payload);
          // Reload posts to get updated comment counts
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  const loadSinglePost = async (postId: string) => {
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
        .eq('id', postId)
        .single();

      if (!error && data) {
        setPosts((prev) => {
          // Check if post already exists
          const exists = prev.some((p) => p.id === postId);
          if (exists) {
            return prev.map((p) => (p.id === postId ? data : p));
          } else {
            return [data, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        });
      }
    } catch (error) {
      console.error('Error loading single post:', error);
    }
  };

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

  const uploadImage = async (localUri: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get file extension
      const fileExtension = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
      const filePath = `post-images/${fileName}`;

      // Read file as blob for React Native
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, blob, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
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

  const createPost = async (postData: Omit<Post, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'like_count' | 'view_count' | 'comment_count' | 'status'>) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload images if any
      let imageUrls: string[] = [];
      if (postData.images && postData.images.length > 0) {
        imageUrls = await Promise.all(
          postData.images.map((uri) => uploadImage(uri))
        );
      }

      const postInsert = {
        ...postData,
        images: imageUrls,
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
        // Real-time subscription will handle adding it to the list
      }
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const likePost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.from('post_likes').insert({
        user_id: user.id,
        post_id: postId,
      });

      if (error) {
        // If it's a unique constraint violation, the user already liked it
        if (error.code === '23505') {
          console.log('Post already liked');
          return;
        }
        throw error;
      }
      // Real-time subscription will handle updating the count
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  };

  const unlikePost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) {
        throw error;
      }
      // Real-time subscription will handle updating the count
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  };

  const getPostLikes = async (postId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (error) {
        throw error;
      }

      return data?.map((like) => like.user_id) || [];
    } catch (error) {
      console.error('Error getting post likes:', error);
      return [];
    }
  };

  const getPostComments = async (postId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting post comments:', error);
      return [];
    }
  };

  const addComment = async (postId: string, text: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.from('comments').insert({
        user_id: user.id,
        post_id: postId,
        text: text.trim(),
      });

      if (error) {
        throw error;
      }
      // Real-time subscription will handle updating the count
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const refreshPosts = async () => {
    await loadPosts();
  };

  return (
    <FeedContext.Provider
      value={{
        posts,
        loading,
        createPost,
        refreshPosts,
        likePost,
        unlikePost,
        getPostLikes,
        getPostComments,
        addComment,
        uploadImage,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};
