/**
 * AuthContext - Authentication state management
 * Provides auth state, user profile, and team membership across the app
 * Requirements: 1.2
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import {
  getSession,
  onAuthStateChange,
  signOut as authSignOut
} from '../services/supabase/authService';
import {
  getProfile,
  type UserProfile
} from '../services/supabase/profileService';
import {
  getUserTeams,
  type Team,
  type TeamRole
} from '../services/supabase/teamService';

// Auth flow states
export type AuthStep =
  | 'loading'           // Initial loading
  | 'unauthenticated'   // No session - show phone login
  | 'verifying_otp'     // OTP sent, waiting for verification
  | 'profile_setup'     // Authenticated but no profile
  | 'team_join'         // Has profile but no team
  | 'authenticated';    // Fully authenticated with profile and team

// Team with role info
export interface UserTeam extends Team {
  team_role: TeamRole;
}

// Context value interface
interface AuthContextValue {
  // Auth state
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  teams: UserTeam[];
  currentTeam: UserTeam | null;
  authStep: AuthStep;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  setAuthStep: (step: AuthStep) => void;
  setPhoneForVerification: (phone: string) => void;
  phoneForVerification: string | null;
  refreshProfile: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  setCurrentTeam: (team: UserTeam | null) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  resetAuth: () => void;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Core auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [currentTeam, setCurrentTeam] = useState<UserTeam | null>(null);

  // UI state
  const [authStep, setAuthStep] = useState<AuthStep>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs to track current state in callbacks (avoids stale closure issues)
  const profileRef = useRef<UserProfile | null>(null);
  const authStepRef = useRef<AuthStep>('loading');
  const initialAuthCompleteRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    authStepRef.current = authStep;
    // Mark initial auth as complete once we're no longer in loading state
    if (authStep !== 'loading') {
      initialAuthCompleteRef.current = true;
    }
  }, [authStep]);
  const [phoneForVerification, setPhoneForVerification] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userProfile = await getProfile(user.id);
      setProfile(userProfile);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  }, [user]);

  // Refresh teams data
  const refreshTeams = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getUserTeams();
      if (result.success && result.teams) {
        setTeams(result.teams);

        // If no current team selected, select the first one
        if (!currentTeam && result.teams.length > 0) {
          // Try to restore from localStorage
          const savedTeamId = localStorage.getItem('currentTeamId');
          const savedTeam = result.teams.find(t => t.id === savedTeamId);
          setCurrentTeam(savedTeam || result.teams[0]);
        }
      }
    } catch (err) {
      console.error('Error refreshing teams:', err);
    }
  }, [user, currentTeam]);

  // Determine auth step based on current state
  const determineAuthStep = useCallback(async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) {
      setAuthStep('unauthenticated');
      return true;
    }

    try {
      const userId = currentSession.user.id;

      // Fetch profile first - this is required
      let userProfile: UserProfile | null = null;
      try {
        userProfile = await getProfile(userId);
      } catch (profileErr) {
        console.error('Error fetching profile:', profileErr);
        // Profile fetch failed - user needs to set up profile
        setAuthStep('profile_setup');
        return true;
      }

      // Check if profile exists (getProfile returns null if not found)
      if (!userProfile) {
        setAuthStep('profile_setup');
        return true;
      }

      setProfile(userProfile);

      // Admin roles (dev, owner, bdm) don't require a team to use the app
      const isAdminRole = userProfile.role && ['dev', 'owner', 'bdm'].includes(userProfile.role);

      // Fetch teams - this can fail gracefully for admin users
      let teamsResult: { success: boolean; teams?: (Team & { team_role: TeamRole })[] } = { success: false };
      try {
        teamsResult = await getUserTeams();
      } catch (teamsErr) {
        console.error('Error fetching teams:', teamsErr);
        // Teams fetch failed - admin users can continue, others need to join a team
        if (isAdminRole) {
          setAuthStep('authenticated');
          return true;
        }
        setAuthStep('team_join');
        return true;
      }

      // Process teams
      if (teamsResult.success && teamsResult.teams) {
        setTeams(teamsResult.teams);

        if (teamsResult.teams.length === 0) {
          // Admin roles can skip team requirement
          if (isAdminRole) {
            setAuthStep('authenticated');
            return true;
          }
          setAuthStep('team_join');
          return true;
        }

        // Restore or set current team
        const savedTeamId = localStorage.getItem('currentTeamId');
        const savedTeam = teamsResult.teams.find(t => t.id === savedTeamId);
        setCurrentTeam(savedTeam || teamsResult.teams[0]);
      } else {
        // Admin roles can skip team requirement
        if (isAdminRole) {
          setAuthStep('authenticated');
          return true;
        }
        setAuthStep('team_join');
        return true;
      }

      setAuthStep('authenticated');
      return true;
    } catch (err) {
      console.error('Error determining auth step:', err);
      // On error, default to unauthenticated to prevent infinite loading
      setAuthStep('unauthenticated');
      return false;
    }
  }, []);

  // Retry auth - useful when user wants to retry after a failure
  const retryAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentSession = await getSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);
      await determineAuthStep(currentSession);
    } catch (err) {
      console.error('Error retrying auth:', err);
      setAuthStep('unauthenticated');
      setError('Failed to connect. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  }, [determineAuthStep]);

  // Handle auth state changes
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading (8 seconds)
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          timeoutId = setTimeout(() => resolve('timeout'), 8000);
        });

        const authPromise = async (): Promise<'success' | 'error'> => {
          try {
            const currentSession = await getSession();

            if (!mounted) return 'error';

            setSession(currentSession);
            setUser(currentSession?.user || null);

            const success = await determineAuthStep(currentSession);
            return success ? 'success' : 'error';
          } catch (err) {
            console.error('Auth promise error:', err);
            return 'error';
          }
        };

        const result = await Promise.race([authPromise(), timeoutPromise]);
        
        if (timeoutId) clearTimeout(timeoutId);

        if (result === 'timeout' && mounted) {
          console.warn('Auth initialization timed out');
          // On timeout, check if we have a session - if so, try to continue
          // Otherwise show login screen
          const session = await getSession().catch(() => null);
          if (session) {
            // We have a session but profile/team fetch timed out
            // Show authenticated state and let user retry if needed
            setSession(session);
            setUser(session.user);
            setAuthStep('authenticated');
            setError('Some data failed to load. Pull down to refresh.');
          } else {
            setAuthStep('unauthenticated');
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          // On error, show unauthenticated state
          setAuthStep('unauthenticated');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth changes
    const subscription = onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      if (!mounted) return;

      console.log('Auth state changed:', event);

      if (event === 'SIGNED_IN') {
        // Use refs to get current values (avoids stale closure)
        const currentProfile = profileRef.current;
        const currentAuthStep = authStepRef.current;
        const isInitialAuthComplete = initialAuthCompleteRef.current;
        
        // If initial auth hasn't completed yet, let initAuth handle it
        // This prevents race conditions during startup
        if (!isInitialAuthComplete) {
          console.log('SIGNED_IN during initial auth - letting initAuth handle it');
          return;
        }
        
        // Check if this is a session recovery (we already have profile loaded)
        // vs a fresh sign in (no profile yet)
        const isSessionRecovery = currentProfile !== null && currentAuthStep === 'authenticated';
        
        if (isSessionRecovery) {
          // Just update session silently without showing loading or re-fetching
          console.log('Session recovery - updating silently');
          setSession(newSession);
          setUser(newSession?.user || null);
          return;
        }

        // Fresh sign in - show loading and fetch profile/teams
        setSession(newSession);
        setUser(newSession?.user || null);
        setIsLoading(true);
        setError(null);
        try {
          await determineAuthStep(newSession);
        } catch (err) {
          console.error('Error after sign in:', err);
          // Even on error, try to show authenticated state if we have a session
          if (newSession) {
            setAuthStep('authenticated');
          } else {
            setAuthStep('unauthenticated');
          }
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setTeams([]);
        setCurrentTeam(null);
        setAuthStep('unauthenticated');
        setError(null);
        localStorage.removeItem('currentTeamId');
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed - just update session silently
        setSession(newSession);
        setUser(newSession?.user || null);
      } else if (event === 'INITIAL_SESSION') {
        // Initial session from storage - handled by initAuth, ignore here
        console.log('Initial session event - handled by initAuth');
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [determineAuthStep]);

  // Persist current team selection
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeamId', currentTeam.id);
    }
  }, [currentTeam]);

  // Note: We don't need manual visibility change handling because:
  // 1. Supabase client already handles session persistence via localStorage
  // 2. The onAuthStateChange subscription handles session recovery events
  // 3. Adding manual checks can cause duplicate SIGNED_IN events and loading states

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authSignOut();
      if (!result.success) {
        setError(result.error || 'Failed to sign out');
      }
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    teams,
    currentTeam,
    authStep,
    isLoading,
    error,
    setAuthStep,
    setPhoneForVerification,
    phoneForVerification,
    refreshProfile,
    refreshTeams,
    setCurrentTeam,
    signOut: handleSignOut,
    clearError,
    retryAuth,
    // Debug/Recovery
    resetAuth: () => {
      setAuthStep('unauthenticated');
      setIsLoading(false);
      setSession(null);
      setUser(null);
      setProfile(null);
      setTeams([]);
      setCurrentTeam(null);
      setError(null);
      localStorage.removeItem('currentTeamId');
      // Clear Supabase session from localStorage (default key format)
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '';
      localStorage.removeItem(`sb-${projectRef}-auth-token`);
      window.location.reload(); // Force reload to clear any hung states
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth() {
  const auth = useAuth();

  if (auth.authStep !== 'authenticated') {
    throw new Error('User must be authenticated');
  }

  return {
    ...auth,
    user: auth.user!,
    profile: auth.profile!,
    currentTeam: auth.currentTeam!,
  };
}
