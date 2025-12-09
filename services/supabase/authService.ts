import { supabase } from './client';
import type { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';

// Phone number validation regex (E.164 format or common formats)
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

// Rate limiting state (client-side tracking)
interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
}

const rateLimitMap = new Map<string, RateLimitState>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

/**
 * Validates phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove spaces and dashes for validation
  const cleanPhone = phone.replace(/[\s-]/g, '');
  return PHONE_REGEX.test(cleanPhone);
}

/**
 * Formats phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  let cleanPhone = phone.replace(/[\s-]/g, '');
  // Add + prefix if not present
  if (!cleanPhone.startsWith('+')) {
    // Assume Indian number if no country code
    if (cleanPhone.length === 10) {
      cleanPhone = '+91' + cleanPhone;
    } else {
      cleanPhone = '+' + cleanPhone;
    }
  }
  return cleanPhone;
}

/**
 * Checks if phone number is rate limited
 */
function isRateLimited(phone: string): boolean {
  const state = rateLimitMap.get(phone);
  if (!state) return false;
  
  const now = Date.now();
  // Reset if window has passed
  if (now - state.firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.delete(phone);
    return false;
  }
  
  return state.attempts >= MAX_ATTEMPTS;
}


/**
 * Records an OTP attempt for rate limiting
 */
function recordAttempt(phone: string): void {
  const state = rateLimitMap.get(phone);
  const now = Date.now();
  
  if (!state || now - state.firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(phone, { attempts: 1, firstAttemptTime: now });
  } else {
    state.attempts++;
  }
}

/**
 * Sends OTP to the provided phone number
 * Requirements: 1.1, 1.5
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  // Validate phone number format
  if (!validatePhoneNumber(phone)) {
    return { success: false, error: 'Please enter a valid phone number' };
  }
  
  const formattedPhone = formatPhoneNumber(phone);
  
  // Check rate limiting
  if (isRateLimited(formattedPhone)) {
    return { 
      success: false, 
      error: 'Too many attempts. Please wait before trying again' 
    };
  }
  
  try {
    // Record this attempt
    recordAttempt(formattedPhone);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    return { success: false, error: message };
  }
}

/**
 * Verifies OTP and creates a session
 * Requirements: 1.2, 1.3, 1.4
 */
export async function verifyOTP(
  phone: string, 
  otp: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  // Validate inputs
  if (!validatePhoneNumber(phone)) {
    return { success: false, error: 'Please enter a valid phone number' };
  }
  
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return { success: false, error: 'Please enter a valid 6-digit code' };
  }
  
  const formattedPhone = formatPhoneNumber(phone);
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });
    
    if (error) {
      // Handle specific error cases
      if (error.message.includes('expired')) {
        return { 
          success: false, 
          error: 'Your code has expired. Please request a new one' 
        };
      }
      return { success: false, error: 'Invalid code. Please try again' };
    }
    
    if (!data.user) {
      return { success: false, error: 'Authentication failed' };
    }
    
    return { success: true, user: data.user };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return { success: false, error: message };
  }
}


/**
 * Gets the current session
 * Requirements: 1.2
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    
    return session;
  } catch (err) {
    console.error('Error getting session:', err);
    return null;
  }
}

/**
 * Gets the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error.message);
      return null;
    }
    
    return user;
  } catch (err) {
    console.error('Error getting user:', err);
    return null;
  }
}

/**
 * Signs out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return { success: false, error: message };
  }
}

/**
 * Listens to authentication state changes
 * Requirements: 1.2
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): Subscription {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

/**
 * Refreshes the current session
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error.message);
      return null;
    }
    
    return session;
  } catch (err) {
    console.error('Error refreshing session:', err);
    return null;
  }
}

// Export types for convenience
export type { Session, User, AuthChangeEvent, Subscription };
