import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
    profile_pic_url: string | null;
  };
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
    profile_pic_url: string | null;
  };
}

interface CommunityContextType {
  communities: Community[];
  myCommunities: Community[];
  loading: boolean;
  createCommunity: (data: {
    name: string;
    description?: string;
    image_url?: string;
    category?: string;
  }) => Promise<Community>;
  joinCommunity: (communityId: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
  getMyCommunities: () => Promise<Community[]>;
  refreshCommunities: () => Promise<void>;
  isMember: (communityId: string) => boolean;
  getCommunityMembers: (communityId: string) => Promise<CommunityMember[]>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};

export const CommunityProvider = ({ children }: { children: ReactNode }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCommunityIds, setMyCommunityIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommunities();
    loadMyCommunities();
  }, []);

  const loadSingleCommunity = async (communityId: string) => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          users!communities_created_by_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .eq('id', communityId)
        .single();

      if (!error && data) {
        setCommunities((prev) => {
          const exists = prev.some((c) => c.id === communityId);
          if (exists) {
            return prev.map((c) => (c.id === communityId ? data : c));
          } else {
            return [data, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        });
      }
    } catch (error) {
      console.error('Error loading single community:', error);
    }
  };

  const loadCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          users!communities_created_by_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading communities:', error);
        return;
      }

      if (data) {
        setCommunities(data);
      }
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyCommunities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMyCommunities([]);
        setMyCommunityIds(new Set());
        return;
      }

      // Get communities where user is a member
      const { data: memberships, error } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading my communities:', error);
        return;
      }

      const communityIds = memberships?.map((m) => m.community_id) || [];
      setMyCommunityIds(new Set(communityIds));

      if (communityIds.length === 0) {
        setMyCommunities([]);
        return;
      }

      // Fetch the actual community data
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select(`
          *,
          users!communities_created_by_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .in('id', communityIds)
        .order('created_at', { ascending: false });

      if (communitiesError) {
        console.error('Error loading my communities data:', communitiesError);
        return;
      }

      if (communitiesData) {
        setMyCommunities(communitiesData);
      }
    } catch (error) {
      console.error('Error loading my communities:', error);
    }
  };

  const createCommunity = async (data: {
    name: string;
    description?: string;
    image_url?: string;
    category?: string;
  }): Promise<Community> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: community, error } = await supabase
        .from('communities')
        .insert([
          {
            ...data,
            created_by: user.id,
            member_count: 0,
          },
        ])
        .select(`
          *,
          users!communities_created_by_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      if (!community) {
        throw new Error('Failed to create community');
      }

      // Automatically join the community as the creator
      await joinCommunity(community.id);

      // Manually add to communities list and refresh
      setCommunities((prev) => [community, ...prev]);
      await refreshCommunities();

      return community;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  };

  const joinCommunity = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.from('community_members').insert({
        user_id: user.id,
        community_id: communityId,
        role: 'member',
      });

      if (error) {
        // If it's a unique constraint violation, the user already joined
        if (error.code === '23505') {
          console.log('Already a member of this community');
          return;
        }
        throw error;
      }

      // Update local state optimistically
      setMyCommunityIds((prev) => new Set([...prev, communityId]));
      
      // Refresh communities to get updated member counts and lists
      await refreshCommunities();
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('user_id', user.id)
        .eq('community_id', communityId);

      if (error) {
        throw error;
      }

      // Update local state optimistically
      setMyCommunityIds((prev) => {
        const next = new Set(prev);
        next.delete(communityId);
        return next;
      });
      
      // Refresh communities to get updated member counts and lists
      await refreshCommunities();
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  };

  const getMyCommunities = async (): Promise<Community[]> => {
    await loadMyCommunities();
    return myCommunities;
  };

  const refreshCommunities = async () => {
    await Promise.all([loadCommunities(), loadMyCommunities()]);
  };

  const isMember = (communityId: string): boolean => {
    return myCommunityIds.has(communityId);
  };

  const getCommunityMembers = async (communityId: string): Promise<CommunityMember[]> => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          users!community_members_user_id_fkey (
            id,
            name,
            email,
            profile_pic_url
          )
        `)
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting community members:', error);
      return [];
    }
  };

  return (
    <CommunityContext.Provider
      value={{
        communities,
        myCommunities,
        loading,
        createCommunity,
        joinCommunity,
        leaveCommunity,
        getMyCommunities,
        refreshCommunities,
        isMember,
        getCommunityMembers,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

