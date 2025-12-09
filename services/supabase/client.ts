import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These values can be overridden by environment variables in production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bglmbaebjmylpgcltjdn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbG1iYWViam15bHBnY2x0amRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY4MzUsImV4cCI6MjA4MDg2MjgzNX0.2VwCd55AEt_UFadM0ZuU686OWH8QmPB67r20H0Ji3Js';

// Create Supabase client with auth configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Export configuration for reference
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};
