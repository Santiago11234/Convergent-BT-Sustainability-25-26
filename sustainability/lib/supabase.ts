import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkfvwxydzuqxwuwljubc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZnZ3eHlkenVxeHd1d2xqdWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTgzMjIsImV4cCI6MjA3NTkzNDMyMn0.UGgGkGJ8OvIbz2b9sa8FmgXtVZSY7hWGIM0LlYV1qBg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

