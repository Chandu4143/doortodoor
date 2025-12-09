/**
 * AuthContext - Authentication state management
 * Provides auth state, user profile, and team membership across the app
 * Requirements: 1.2
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  getSession, 
  onAuthStateChange, 
  signOut as authSignOut 
} from '../services/supabase/authService';
import { 
  getProfile, 
  hasProfile, 
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
  const determineAuthStep = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setAuthStep('unauthenticated');
      return;
    }

    // Check if user has a profile
    const userHasProfile = await hasProfile();
    if (!userHasProfile) {
      setAuthStep('profile_setup');
      return;
    }

    // Load profile
    const userProfile = await getProfile(currentSession.user.id);
    setProfile(userProfile);

    // Check if user has teams
    const teamsResult = await getUserTeams();
    if (teamsResult.success && teamsResult.teams) {
      setTeams(teamsResult.teams);
      
      if (teamsResult.teams.length === 0) {
        setAuthStep('team_join');
        return;
      }

      // Restore or set current team
      const savedTeamId = localStorage.getItem('currentTeamId');
      const savedTeam = teamsResult.teams.find(t => t.id === savedTeamId);
      setCurrentTeam(savedTeam || teamsResult.teams[0]);
    } else {
      setAuthStep('team_join');
      return;
    }

    setAuthStep('authenticated');
  }, []);

  // Handle auth state changes
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentSession = await getSession();
        
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        await determineAuthStep(currentSession);
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
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

      setSession(newSession);
      setUser(newSession?.user || null);

      if (event === 'SIGNED_IN') {
        setIsLoading(true);
        await determineAuthStep(newSession);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setTeams([]);
        setCurrentTeam(null);
        setAuthStep('unauthenticated');
        localStorage.removeItem('currentTeamId');
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, no action needed
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [determineAuthStep]);

  // Persist current team selection
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeamId', currentTeam.id);
    }
  }, [currentTeam]);

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
