import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl !== 'MY_SUPABASE_URL' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY'
);

// Gracefully instantiate client with actual credentials or dummy values to prevent crash on startup
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);
