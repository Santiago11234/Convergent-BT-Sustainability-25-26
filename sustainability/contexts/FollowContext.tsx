import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface FollowContextType {
  following: string[];
  followers: string[];
  isFollowing: (userId: string) => boolean;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  getFollowers: (userId: string) => Promise<User[]>;
  getFollowing: (userId: string) => Promise<User[]>;
  refreshFollows: () => Promise<void>;
  loading: boolean;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};

export const FollowProvider = ({ children, userId }: { children: ReactNode; userId: string | null }) => {
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadFollows();
      setupRealtimeListeners();
    } else {
      setFollowing([]);
      setFollowers([]);
      setLoading(false);
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [userId]);

  const loadFollows = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get who the user is following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      // Get who follows the user
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followingError) throw followingError;
      if (followersError) throw followersError;

      setFollowing(followingData?.map(f => f.following_id) || []);
      setFollowers(followersData?.map(f => f.follower_id) || []);
    } catch (error) {
      console.error('Error loading follows:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    if (!userId) return;

    // Listen for new follows/unfollows
    const followsChannel = supabase
      .channel(`follows_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${userId}`,
        },
        (payload) => {
          loadFollows();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${userId}`,
        },
        (payload) => {
          loadFollows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
    };
  };

  const isFollowing = (userId: string): boolean => {
    return following.includes(userId);
  };

  const followUser = async (userIdToFollow: string) => {
    if (!userId || userId === userIdToFollow) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: userId,
          following_id: userIdToFollow,
        });

      if (error) {
        if (error.code === '23505') {
          return;
        }
        throw error;
      }

      // Optimistically update UI
      setFollowing(prev => [...prev, userIdToFollow]);
      
      // Real-time listener will update the count via triggers
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  };

  const unfollowUser = async (userIdToUnfollow: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', userIdToUnfollow);

      if (error) throw error;

      // Optimistically update UI
      setFollowing(prev => prev.filter(id => id !== userIdToUnfollow));
      
      // Real-time listener will update the count via triggers
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  };

  const getFollowers = async (targetUserId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          users!follows_follower_id_fkey (
            id,
            name,
            email,
            profile_pic_url,
            bio,
            follower_count,
            following_count,
            seller_rating,
            is_verified_seller
          )
        `)
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map((item: any) => item.users).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  };

  const getFollowing = async (targetUserId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          users!follows_following_id_fkey (
            id,
            name,
            email,
            profile_pic_url,
            bio,
            follower_count,
            following_count,
            seller_rating,
            is_verified_seller
          )
        `)
        .eq('follower_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map((item: any) => item.users).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  };

  const refreshFollows = async () => {
    await loadFollows();
  };

  return (
    <FollowContext.Provider
      value={{
        following,
        followers,
        isFollowing,
        followUser,
        unfollowUser,
        getFollowers,
        getFollowing,
        refreshFollows,
        loading,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

