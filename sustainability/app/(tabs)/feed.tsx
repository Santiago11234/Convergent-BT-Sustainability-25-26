import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFeed } from '@/contexts/FeedContext';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Comment } from '@/types';
import { getRelativeTime } from '@/utils/relativeTime';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { posts, loading, refreshPosts, likePost, unlikePost, getPostLikes, getPostComments, addComment, likeComment, unlikeComment, getCommentLikes } = useFeed();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, string[]>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment ID being replied to
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
          console.log('Comment likes real-time update:', payload);
          
          // Reload comment likes for the currently open post
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

  const openComments = async (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    setReplyingTo(null);
    
    // Load comments for this post
    const postComments = await getPostComments(post.id);
    setComments((prev) => ({
      ...prev,
      [post.id]: postComments,
    }));

    // Load comment likes
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
    
    // Reload comments
    const postComments = await getPostComments(selectedPost.id);
    setComments((prev) => ({
      ...prev,
      [selectedPost.id]: postComments,
    }));

    // Reload comment likes
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

  const handleLikeComment = async (commentId: string) => {
    if (!user || !selectedPost) return;

    const userLikes = commentLikes[commentId] || [];
    const isLiked = userLikes.includes(user.id);

    // Optimistically update UI immediately (before API call)
    if (isLiked) {
      // Unlike: remove user from likes and decrement count
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((id) => id !== user.id),
      }));
      
      // Update comment like_count optimistically
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];
        return {
          ...prev,
          [selectedPost.id]: postComments.map((comment: any) => {
            // Update main comment
            if (comment.id === commentId) {
              return { ...comment, like_count: Math.max(0, (comment.like_count || 0) - 1) };
            }
            // Update replies
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
      // Like: add user to likes and increment count
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), user.id],
      }));
      
      // Update comment like_count optimistically
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];
        return {
          ...prev,
          [selectedPost.id]: postComments.map((comment: any) => {
            // Update main comment
            if (comment.id === commentId) {
              return { ...comment, like_count: (comment.like_count || 0) + 1 };
            }
            // Update replies
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

  const renderPost = ({ item }: { item: Post }) => {
    const userLikes = postLikes[item.id] || [];
    const isLiked = user?.id && userLikes.includes(user.id);

    return (
      <View className="bg-white border-b border-gray-200 pb-4 mb-4">
        {/* User Header */}
        <View className="flex-row items-center px-4 py-3">
          <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 items-center justify-center overflow-hidden">
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
            <Text className="font-semibold text-gray-900">
              {(item as any).users?.name || (item as any).users?.email?.split('@')[0] || 'Unknown User'}
            </Text>
            <Text className="text-xs text-gray-500">
              {getRelativeTime(item.created_at)}
            </Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </View>

        {/* Post Content */}
        {item.post_type === 'blog' && item.content_markdown && (
          <View className="px-4 py-2">
            <Text className="text-xl font-bold text-gray-900 mb-2">{item.title}</Text>
            <Text className="text-base text-gray-700">{item.content_markdown}</Text>
          </View>
        )}

        {item.post_type === 'image' && item.images && item.images.length > 0 && (
          <View className="bg-gray-50 h-64">
            <Image source={{ uri: item.images[0] }} className="w-full h-full" resizeMode="cover" />
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
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            onPress={() => handleLike(item.id)}
            className="flex-row items-center"
            disabled={!user}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "#EF4444" : "#374151"} 
            />
            <Text className="text-sm text-gray-600 ml-1">{item.like_count || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => openComments(item)}
            className="flex-row items-center"
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#374151" />
            <Text className="text-sm text-gray-600 ml-1">{item.comment_count || 0}</Text>
          </TouchableOpacity>
          
          <Ionicons name="share-outline" size={24} color="#374151" style={{ marginLeft: 16 }} />
        </View>

        {/* Caption */}
        <View className="px-4">
          <Text className="text-base font-semibold text-gray-900 mb-1">{item.title}</Text>
          {item.description && (
            <Text className="text-sm text-gray-700">{item.description}</Text>
          )}
          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap mt-2">
              {item.tags.map((tag, index) => (
                <Text key={index} className="text-sm text-blue-600 mr-2">
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-3xl font-black text-gray-900">Feed</Text>
          <TouchableOpacity 
            onPress={() => router.push('/createPost')}
            className="bg-primary px-4 py-2 rounded-xl flex-row items-center"
          >
            <Ionicons name="add-circle" size={20} color="white" />
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
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="images-outline" size={64} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-400 mt-4">No Posts Yet</Text>
          <Text className="text-sm text-gray-400 mt-2 mb-6">Be the first to share something!</Text>
          <TouchableOpacity
            onPress={() => router.push('/createPost')}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Create Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item, index) => item.id || index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />

          {/* Comments Modal - Half Screen Bottom Sheet */}
          <Modal
            visible={commentModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setCommentModalVisible(false);
              setReplyingTo(null);
            }}
          >
            <View className="flex-1 justify-end bg-black/50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
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
                style={{ height: SCREEN_HEIGHT * 0.6, maxHeight: SCREEN_HEIGHT * 0.9 }}
              >
                <SafeAreaView className="flex-1" edges={['bottom']}>
                  {/* Header */}
                  <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                    <Text className="text-xl font-bold text-gray-900">Comments</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setCommentModalVisible(false);
                        setReplyingTo(null);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                    keyboardVerticalOffset={90}
                  >
                    <ScrollView className="flex-1 px-4 py-2">
                      {selectedPost && comments[selectedPost.id]?.map((comment) => {
                        const userLikes = commentLikes[comment.id] || [];
                        const isLiked = user?.id && userLikes.includes(user.id);
                        const replies = (comment as any).replies || [];

                        return (
                          <View key={comment.id} className="mb-4 pb-4 border-b border-gray-100">
                            {/* Main Comment */}
                            <View className="flex-row">
                              <View className="w-8 h-8 rounded-full bg-gray-200 mr-2 items-center justify-center overflow-hidden">
                                {(comment as any).users?.profile_pic_url ? (
                                  <Image
                                    source={{ uri: (comment as any).users.profile_pic_url }}
                                    className="w-full h-full rounded-full"
                                  />
                                ) : (
                                  <Ionicons name="person" size={16} color="#9CA3AF" />
                                )}
                              </View>
                              <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                  <Text className="font-semibold text-gray-900 text-sm mr-2">
                                    {(comment as any).users?.name || (comment as any).users?.email?.split('@')[0] || 'Unknown'}
                                  </Text>
                                  <Text className="text-xs text-gray-500">
                                    {getRelativeTime(comment.created_at)}
                                  </Text>
                                </View>
                                <Text className="text-gray-700 mb-2">{comment.text}</Text>
                                <View className="flex-row items-center">
                                  <TouchableOpacity
                                    onPress={() => handleLikeComment(comment.id)}
                                    className="flex-row items-center mr-4"
                                    disabled={!user}
                                  >
                                    <Ionicons 
                                      name={isLiked ? "heart" : "heart-outline"} 
                                      size={16} 
                                      color={isLiked ? "#EF4444" : "#6B7280"} 
                                    />
                                    <Text className="text-xs text-gray-600 ml-1">
                                      {comment.like_count || 0}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => setReplyingTo(comment.id)}
                                    className="flex-row items-center"
                                  >
                                    <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                                    <Text className="text-xs text-gray-600 ml-1">Reply</Text>
                                  </TouchableOpacity>
                                </View>

                                {/* Replies */}
                                {replies.length > 0 && (
                                  <View className="mt-3 ml-2 pl-2 border-l-2 border-gray-200">
                                    {replies.map((reply: Comment) => {
                                      const replyLikes = commentLikes[reply.id] || [];
                                      const isReplyLiked = user?.id && replyLikes.includes(user.id);

                                      return (
                                        <View key={reply.id} className="mb-3">
                                          <View className="flex-row items-center mb-1">
                                            <View className="w-6 h-6 rounded-full bg-gray-200 mr-2 items-center justify-center overflow-hidden">
                                              {(reply as any).users?.profile_pic_url ? (
                                                <Image
                                                  source={{ uri: (reply as any).users.profile_pic_url }}
                                                  className="w-full h-full rounded-full"
                                                />
                                              ) : (
                                                <Ionicons name="person" size={12} color="#9CA3AF" />
                                              )}
                                            </View>
                                            <Text className="font-semibold text-gray-900 text-xs mr-2">
                                              {(reply as any).users?.name || (reply as any).users?.email?.split('@')[0] || 'Unknown'}
                                            </Text>
                                            <Text className="text-xs text-gray-500">
                                              {getRelativeTime(reply.created_at)}
                                            </Text>
                                          </View>
                                          <Text className="text-gray-700 text-sm mb-1 ml-8">{reply.text}</Text>
                                          <View className="flex-row items-center ml-8">
                                            <TouchableOpacity
                                              onPress={() => handleLikeComment(reply.id)}
                                              className="flex-row items-center mr-4"
                                              disabled={!user}
                                            >
                                              <Ionicons 
                                                name={isReplyLiked ? "heart" : "heart-outline"} 
                                                size={14} 
                                                color={isReplyLiked ? "#EF4444" : "#6B7280"} 
                                              />
                                              <Text className="text-xs text-gray-600 ml-1">
                                                {reply.like_count || 0}
                                              </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              onPress={() => setReplyingTo(reply.id)}
                                            >
                                              <Text className="text-xs text-gray-600">Reply</Text>
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
                    <View className="items-center justify-center py-8">
                      <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                      <Text className="text-gray-400 mt-2">No comments yet</Text>
                    </View>
                  )}
                    </ScrollView>

                    {/* Input Section */}
                    <View className="border-t border-gray-200 px-4 py-3 bg-white">
                      {replyingTo && (
                        <View className="flex-row items-center mb-2 px-2 py-1 bg-gray-100 rounded-lg">
                          <Ionicons name="arrow-undo" size={14} color="#6B7280" />
                          <Text className="text-xs text-gray-600 ml-2">Replying to comment</Text>
                          <TouchableOpacity onPress={() => setReplyingTo(null)} className="ml-auto">
                            <Ionicons name="close" size={16} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      )}
                      <View className="flex-row items-center">
                        <TextInput
                          className="flex-1 bg-gray-100 rounded-xl px-4 py-2 mr-2"
                          placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                          placeholderTextColor="#9CA3AF"
                          value={newComment}
                          onChangeText={setNewComment}
                          multiline
                        />
                        <TouchableOpacity
                          onPress={handleAddComment}
                          disabled={!newComment.trim()}
                          className="bg-primary px-4 py-2 rounded-xl"
                        >
                          <Ionicons name="send" size={20} color="white" />
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
