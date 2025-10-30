import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFeed } from '@/contexts/FeedContext';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Comment } from '@/types';

export default function FeedScreen() {
  const router = useRouter();
  const { posts, loading, refreshPosts, likePost, unlikePost, getPostLikes, getPostComments, addComment } = useFeed();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, string[]>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

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
    
    // Load comments for this post
    const postComments = await getPostComments(post.id);
    setComments((prev) => ({
      ...prev,
      [post.id]: postComments,
    }));
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    await addComment(selectedPost.id, newComment);
    
    // Reload comments
    const postComments = await getPostComments(selectedPost.id);
    setComments((prev) => ({
      ...prev,
      [selectedPost.id]: postComments,
    }));

    setNewComment('');
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
              {new Date(item.created_at).toLocaleString()}
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

          {/* Comments Modal */}
          <Modal
            visible={commentModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setCommentModalVisible(false)}
          >
            <SafeAreaView className="flex-1 bg-white">
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                <Text className="text-xl font-bold text-gray-900">Comments</Text>
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
              >
                <ScrollView className="flex-1 px-4 py-2">
                  {selectedPost && comments[selectedPost.id]?.map((comment) => (
                    <View key={comment.id} className="mb-4 pb-4 border-b border-gray-100">
                      <View className="flex-row items-center mb-2">
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
                        <Text className="font-semibold text-gray-900 text-sm">
                          {(comment as any).users?.name || (comment as any).users?.email?.split('@')[0] || 'Unknown'}
                        </Text>
                      </View>
                      <Text className="text-gray-700 ml-10">{comment.text}</Text>
                      <Text className="text-xs text-gray-500 ml-10 mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  {selectedPost && (!comments[selectedPost.id] || comments[selectedPost.id].length === 0) && (
                    <View className="items-center justify-center py-8">
                      <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                      <Text className="text-gray-400 mt-2">No comments yet</Text>
                    </View>
                  )}
                </ScrollView>

                <View className="border-t border-gray-200 px-4 py-3 bg-white">
                  <View className="flex-row items-center">
                    <TextInput
                      className="flex-1 bg-gray-100 rounded-xl px-4 py-2 mr-2"
                      placeholder="Add a comment..."
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
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
