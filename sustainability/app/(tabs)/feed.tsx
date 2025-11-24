import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFeed } from '@/contexts/FeedContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/contexts/FollowContext';
import { Post, Comment } from '@/types';
import { getRelativeTime } from '@/utils/relativeTime';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { posts, loading, refreshPosts, likePost, unlikePost, getPostLikes, getPostComments, addComment, likeComment, unlikeComment, getCommentLikes } = useFeed();
  const { user } = useAuth();
  const { isFollowing } = useFollow();
  const [refreshing, setRefreshing] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, string[]>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, string[]>>({});

  // Set up real-time listener for comment likes
  useEffect(() => {
    if (!selectedPost || commentModalVisible === false) return;

    const commentLikesChannel = supabase
      .channel(`comment_likes_realtime_${selectedPost.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
        },
        async (payload: any) => {
          if (selectedPost && comments[selectedPost.id]) {
            const allComments = comments[selectedPost.id].flatMap(c => [c, ...((c as any).replies || [])]);
            const likesMap: Record<string, string[]> = {};
            
            await Promise.all(
              allComments.map(async (comment) => {
                const likes = await getCommentLikes(comment.id);
                likesMap[comment.id] = likes;
              })
            );
            
            setCommentLikes(prev => ({ ...prev, ...likesMap }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentLikesChannel);
    };
  }, [selectedPost, commentModalVisible, comments, getCommentLikes]);

  // Load likes for all posts on mount and when posts change
  useEffect(() => {
    const loadLikes = async () => {
      const likesMap: Record<string, string[]> = {};
      await Promise.all(
        posts.map(async (post) => {
          const likes = await getPostLikes(post.id);
          likesMap[post.id] = likes;
        })
      );
      setPostLikes(likesMap);
    };
    if (posts.length > 0) {
      loadLikes();
    }
  }, [posts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    const userLikes = postLikes[postId] || [];
    const isLiked = userLikes.includes(user.id);

    if (isLiked) {
      await unlikePost(postId);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((id) => id !== user.id),
      }));
    } else {
      await likePost(postId);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), user.id],
      }));
    }
  };

  const goToProfile = (userId: string) => {
    setCommentModalVisible(false);
    setSelectedPost(null);
    setReplyingTo(null);
    if (user?.id === userId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profile/${userId}`);
    }
  };

  const openComments = async (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    setReplyingTo(null);
    
    const postComments = await getPostComments(post.id);
    setComments((prev) => ({
      ...prev,
      [post.id]: postComments,
    }));

    const loadCommentLikes = async () => {
      const likesMap: Record<string, string[]> = {};
      const allComments = postComments.flatMap(c => [c, ...((c as any).replies || [])]);
      
      await Promise.all(
        allComments.map(async (comment) => {
          const likes = await getCommentLikes(comment.id);
          likesMap[comment.id] = likes;
        })
      );
      
      setCommentLikes(prev => ({ ...prev, ...likesMap }));
    };
    
    loadCommentLikes();
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    await addComment(selectedPost.id, newComment, replyingTo || undefined);
    
    const postComments = await getPostComments(selectedPost.id);
    setComments((prev) => ({
      ...prev,
      [selectedPost.id]: postComments,
    }));

    const loadCommentLikes = async () => {
      const likesMap: Record<string, string[]> = {};
      const allComments = postComments.flatMap(c => [c, ...((c as any).replies || [])]);
      
      await Promise.all(
        allComments.map(async (comment) => {
          const likes = await getCommentLikes(comment.id);
          likesMap[comment.id] = likes;
        })
      );
      
      setCommentLikes(prev => ({ ...prev, ...likesMap }));
    };
    
    loadCommentLikes();

    setNewComment('');
    setReplyingTo(null);
  };

  const handleShare = async (post: Post) => {
    try {
      const authorName = (post as any).users?.name || (post as any).users?.email?.split('@')[0] || 'Unknown User';
      
      let message = post.title.trim();
      
      if (post.description && post.description.trim()) {
        let desc = post.description.trim();
        if (desc.endsWith('...')) {
          desc = desc.slice(0, -3).trim();
        }
        message += `\n${desc}`;
      }
      
      if (post.post_type === 'blog' && post.content_markdown && post.content_markdown.trim()) {
        message += `\n${post.content_markdown.trim()}`;
      }
      
      if (post.tags && post.tags.length > 0) {
        const tagsString = post.tags.map(tag => `#${tag}`).join(' ');
        message += `\n${tagsString}`;
      }
      
      message += `\nPosted by ${authorName}`;

      await Share.share({
        message: message,
        title: post.title,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share post');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user || !selectedPost) return;

    const userLikes = commentLikes[commentId] || [];
    const isLiked = userLikes.includes(user.id);

    if (isLiked) {
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((id) => id !== user.id),
      }));
      
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];
        return {
          ...prev,
          [selectedPost.id]: postComments.map((comment: any) => {
            if (comment.id === commentId) {
              return { ...comment, like_count: Math.max(0, (comment.like_count || 0) - 1) };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map((reply: any) =>
                  reply.id === commentId
                    ? { ...reply, like_count: Math.max(0, (reply.like_count || 0) - 1) }
                    : reply
                ),
              };
            }
            return comment;
          }),
        };
      });
      
      await unlikeComment(commentId);
    } else {
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), user.id],
      }));
      
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];
        return {
          ...prev,
          [selectedPost.id]: postComments.map((comment: any) => {
            if (comment.id === commentId) {
              return { ...comment, like_count: (comment.like_count || 0) + 1 };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map((reply: any) =>
                  reply.id === commentId
                    ? { ...reply, like_count: (reply.like_count || 0) + 1 }
                    : reply
                ),
              };
            }
            return comment;
          }),
        };
      });
      
      await likeComment(commentId);
    }
  };

  // Sort posts to prioritize followed users
  const sortedPosts = [...posts].sort((a, b) => {
    if (!user) return 0;
    const aAuthorId = (a as any).users?.id || a.author_id;
    const bAuthorId = (b as any).users?.id || b.author_id;
    const aFollowing = aAuthorId !== user.id && isFollowing(aAuthorId);
    const bFollowing = bAuthorId !== user.id && isFollowing(bAuthorId);
    
    if (aFollowing && !bFollowing) return -1;
    if (!aFollowing && bFollowing) return 1;
    return 0;
  });

  // Separate component for post card to use hooks properly
  const PostCard = ({ 
    item, 
    index, 
    postLikes, 
    user, 
    isFollowing, 
    goToProfile, 
    handleLike, 
    openComments, 
    handleShare 
  }: { 
    item: Post; 
    index: number; 
    postLikes: Record<string, string[]>;
    user: any;
    isFollowing: (userId: string) => boolean;
    goToProfile: (userId: string) => void;
    handleLike: (postId: string) => void;
    openComments: (post: Post) => void;
    handleShare: (post: Post) => void;
  }) => {
    const userLikes = postLikes[item.id] || [];
    const isLiked = user?.id && userLikes.includes(user.id);
    const authorId = (item as any).users?.id || item.author_id;
    const isFollowingAuthor = user && authorId !== user.id && isFollowing(authorId);

    return (
      <View className="mb-6">
        <View className="bg-white rounded-3xl overflow-hidden shadow-sm mx-4">
          {/* User Header */}
          <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <TouchableOpacity
              className="flex-row items-center flex-1"
              activeOpacity={0.7}
              onPress={() => goToProfile(authorId)}
            >
              <View className="w-12 h-12 rounded-full bg-gray-100 mr-3 items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {(item as any).users?.profile_pic_url ? (
                  <Image
                    source={{ uri: (item as any).users.profile_pic_url }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-gray-900 text-base">
                    {(item as any).users?.name || (item as any).users?.email?.split('@')[0] || 'Unknown User'}
                  </Text>
                  {isFollowingAuthor && (
                    <View className="ml-2 bg-primary/20 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-semibold text-primary">Following</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {getRelativeTime(item.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="p-2 -mr-2">
              <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          {item.post_type === 'blog' && item.content_markdown && (
            <View className="px-5 py-4">
              <Text className="text-xl font-bold text-gray-900 mb-3">{item.title}</Text>
              <Text className="text-base text-gray-700 leading-6">{item.content_markdown}</Text>
            </View>
          )}

          {item.post_type === 'image' && item.images && item.images.length > 0 && (
            <View className="bg-gray-50">
              <Image 
                source={{ uri: item.images[0] }} 
                className="w-full" 
                style={{ height: 400 }}
                resizeMode="cover" 
              />
            </View>
          )}

          {(item.post_type === 'video' || item.post_type === 'short_video' || item.post_type === 'long_video') && (
            <View className="bg-gray-50 h-64 items-center justify-center">
              {item.video_url ? (
                <Text className="text-gray-500">Video: {item.video_url}</Text>
              ) : (
                <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
              )}
            </View>
          )}
          
          {/* Actions */}
          <View className="flex-row items-center px-5 py-4 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => handleLike(item.id)}
              className="flex-row items-center mr-6"
              disabled={!user}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked ? "#EF4444" : "#6B7280"} 
              />
              <Text className="text-sm font-semibold text-gray-700 ml-2">{item.like_count || 0}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => openComments(item)}
              className="flex-row items-center mr-6"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-700 ml-2">{item.comment_count || 0}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleShare(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Caption */}
          {(item.title || item.description || item.tags) && (
            <View className="px-5 pb-4">
              {item.title && item.post_type !== 'blog' && (
                <Text className="text-base font-bold text-gray-900 mb-2">{item.title}</Text>
              )}
              {item.description && (
                <Text className="text-sm text-gray-700 leading-5 mb-2">{item.description}</Text>
              )}
              {item.tags && item.tags.length > 0 && (
                <View className="flex-row flex-wrap mt-2">
                  {item.tags.map((tag, index) => (
                    <View key={index} className="bg-primary/10 px-3 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-xs font-semibold text-primary">#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <PostCard
      item={item}
      index={index}
      postLikes={postLikes}
      user={user}
      isFollowing={isFollowing}
      goToProfile={goToProfile}
      handleLike={handleLike}
      openComments={openComments}
      handleShare={handleShare}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={require('@/assets/logos/logo.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-gray-900 ml-2">Feed</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/createPost')}
            className="bg-primary px-4 py-2 rounded-xl flex-row items-center shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22C55E" />
          <Text className="text-gray-600 mt-4">Loading posts...</Text>
        </View>
      ) : sortedPosts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="images-outline" size={64} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-400 mt-4">No Posts Yet</Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">Be the first to share something!</Text>
          <TouchableOpacity
            onPress={() => router.push('/createPost')}
            className="bg-primary px-6 py-3 rounded-xl mt-6 shadow-sm"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Create Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={sortedPosts}
            renderItem={renderPost}
            keyExtractor={(item, index) => item.id || index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22C55E" />
            }
          />

          {/* Comments Modal - Bottom Sheet */}
          <Modal
            visible={commentModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setCommentModalVisible(false);
              setReplyingTo(null);
            }}
          >
            <View className="flex-1 justify-end bg-black/50">
              <TouchableOpacity 
                className="flex-1" 
                activeOpacity={1} 
                onPress={() => {
                  setCommentModalVisible(false);
                  setReplyingTo(null);
                }}
              />
              <View 
                className="bg-white rounded-t-3xl"
                style={{ height: SCREEN_HEIGHT * 0.7, maxHeight: SCREEN_HEIGHT * 0.9 }}
              >
                <SafeAreaView className="flex-1" edges={['bottom']}>
                  {/* Header */}
                  <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                    <Text className="text-xl font-bold text-gray-900">Comments</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setCommentModalVisible(false);
                        setReplyingTo(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                    keyboardVerticalOffset={90}
                  >
                    <ScrollView className="flex-1 px-5 py-3">
                      {selectedPost && comments[selectedPost.id]?.map((comment) => {
                        const userLikes = commentLikes[comment.id] || [];
                        const isLiked = user?.id && userLikes.includes(user.id);
                        const replies = (comment as any).replies || [];

                        return (
                          <View key={comment.id} className="mb-5 pb-5 border-b border-gray-100">
                            <View className="flex-row">
                              <TouchableOpacity
                                onPress={() => goToProfile((comment as any).users?.id || comment.user_id)}
                                activeOpacity={0.7}
                              >
                                <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 items-center justify-center overflow-hidden">
                                  {(comment as any).users?.profile_pic_url ? (
                                    <Image
                                      source={{ uri: (comment as any).users.profile_pic_url }}
                                      className="w-full h-full rounded-full"
                                    />
                                  ) : (
                                    <Ionicons name="person" size={18} color="#9CA3AF" />
                                  )}
                                </View>
                              </TouchableOpacity>
                              <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                  <TouchableOpacity
                                    onPress={() => goToProfile((comment as any).users?.id || comment.user_id)}
                                    activeOpacity={0.7}
                                  >
                                    <Text className="font-bold text-gray-900 text-sm mr-2">
                                      {(comment as any).users?.name || (comment as any).users?.email?.split('@')[0] || 'Unknown'}
                                    </Text>
                                  </TouchableOpacity>
                                  <Text className="text-xs text-gray-500">
                                    {getRelativeTime(comment.created_at)}
                                  </Text>
                                </View>
                                <Text className="text-gray-700 mb-2 leading-5">{comment.text}</Text>
                                <View className="flex-row items-center">
                                  <TouchableOpacity
                                    onPress={() => handleLikeComment(comment.id)}
                                    className="flex-row items-center mr-4"
                                    disabled={!user}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons 
                                      name={isLiked ? "heart" : "heart-outline"} 
                                      size={16} 
                                      color={isLiked ? "#EF4444" : "#6B7280"} 
                                    />
                                    <Text className="text-xs font-semibold text-gray-600 ml-1">
                                      {comment.like_count || 0}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => setReplyingTo(comment.id)}
                                    activeOpacity={0.7}
                                  >
                                    <Text className="text-xs font-semibold text-gray-600">Reply</Text>
                                  </TouchableOpacity>
                                </View>

                                {/* Replies */}
                                {replies.length > 0 && (
                                  <View className="mt-3 ml-2 pl-3 border-l-2 border-gray-200">
                                    {replies.map((reply: Comment) => {
                                      const replyLikes = commentLikes[reply.id] || [];
                                      const isReplyLiked = user?.id && replyLikes.includes(user.id);

                                      return (
                                        <View key={reply.id} className="mb-3">
                                          <View className="flex-row items-center mb-1">
                                            <TouchableOpacity
                                              onPress={() => goToProfile((reply as any).users?.id || reply.user_id)}
                                              activeOpacity={0.7}
                                            >
                                              <View className="w-8 h-8 rounded-full bg-gray-200 mr-2 items-center justify-center overflow-hidden">
                                                {(reply as any).users?.profile_pic_url ? (
                                                  <Image
                                                    source={{ uri: (reply as any).users.profile_pic_url }}
                                                    className="w-full h-full rounded-full"
                                                  />
                                                ) : (
                                                  <Ionicons name="person" size={14} color="#9CA3AF" />
                                                )}
                                              </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              onPress={() => goToProfile((reply as any).users?.id || reply.user_id)}
                                              activeOpacity={0.7}
                                            >
                                              <Text className="font-bold text-gray-900 text-xs mr-2">
                                                {(reply as any).users?.name || (reply as any).users?.email?.split('@')[0] || 'Unknown'}
                                              </Text>
                                            </TouchableOpacity>
                                            <Text className="text-xs text-gray-500">
                                              {getRelativeTime(reply.created_at)}
                                            </Text>
                                          </View>
                                          <Text className="text-gray-700 text-sm mb-1 ml-10 leading-5">{reply.text}</Text>
                                          <View className="flex-row items-center ml-10">
                                            <TouchableOpacity
                                              onPress={() => handleLikeComment(reply.id)}
                                              className="flex-row items-center mr-4"
                                              disabled={!user}
                                              activeOpacity={0.7}
                                            >
                                              <Ionicons 
                                                name={isReplyLiked ? "heart" : "heart-outline"} 
                                                size={14} 
                                                color={isReplyLiked ? "#EF4444" : "#6B7280"} 
                                              />
                                              <Text className="text-xs font-semibold text-gray-600 ml-1">
                                                {reply.like_count || 0}
                                              </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              onPress={() => setReplyingTo(reply.id)}
                                              activeOpacity={0.7}
                                            >
                                              <Text className="text-xs font-semibold text-gray-600">Reply</Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                      {selectedPost && (!comments[selectedPost.id] || comments[selectedPost.id].length === 0) && (
                        <View className="items-center justify-center py-12">
                          <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                          <Text className="text-gray-400 mt-3 font-semibold">No comments yet</Text>
                        </View>
                      )}
                    </ScrollView>

                    {/* Input Section */}
                    <View className="border-t border-gray-200 px-5 py-4 bg-white">
                      {replyingTo && (
                        <View className="flex-row items-center mb-3 px-3 py-2 bg-gray-100 rounded-xl">
                          <Ionicons name="arrow-undo" size={14} color="#6B7280" />
                          <Text className="text-xs text-gray-600 ml-2 flex-1">Replying to comment</Text>
                          <TouchableOpacity onPress={() => setReplyingTo(null)} activeOpacity={0.7}>
                            <Ionicons name="close" size={16} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      )}
                      <View className="flex-row items-center">
                        <TextInput
                          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 mr-3 text-base"
                          placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                          placeholderTextColor="#9CA3AF"
                          value={newComment}
                          onChangeText={setNewComment}
                          multiline
                        />
                        <TouchableOpacity
                          onPress={handleAddComment}
                          disabled={!newComment.trim()}
                          className={`px-4 py-3 rounded-2xl ${!newComment.trim() ? 'bg-gray-200' : 'bg-primary'}`}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="send" size={20} color={!newComment.trim() ? "#9CA3AF" : "white"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </SafeAreaView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
