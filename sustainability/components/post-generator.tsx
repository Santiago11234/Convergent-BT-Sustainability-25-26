import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { PostInsert } from '@/types'

export default function PostGenerator() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content fields')
      return
    }

    setIsLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const newPost: PostInsert = {
        title: title.trim(),
        description: content.trim(),
        post_type: 'blog',
        content_markdown: content.trim(),
        author_id: user.id,
        images: [],
        video_url: null,
        thumbnail_url: null,
        duration_seconds: null,
        tags: [],
        is_featured: false,
        status: 'published',
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([newPost])
        .select()

      if (error) {
        throw error
      }

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('')
            setContent('')
          }
        }
      ])
    } catch (error) {
      console.error('Error creating post:', error)
      Alert.alert('Error', 'Failed to create post. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Post</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter post title..."
        value={title}
        onChangeText={setTitle}
        editable={!isLoading}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter post content..."
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        editable={!isLoading}
      />
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={generatePost}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Creating Post...' : 'Generate Post'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 120,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
