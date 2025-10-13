import { StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PostGenerator from '@/components/post-generator';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Post Creator</ThemedText>
        <ThemedText style={styles.subtitle}>
          Create and save posts to Supabase
        </ThemedText>
      </ThemedView>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PostGenerator />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
