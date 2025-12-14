/**
 * useNavigationHistory - Browser history integration for in-app navigation
 * Enables back button to navigate within the app instead of closing it
 */

import { useEffect, useCallback, useRef } from 'react';

export interface NavigationState {
  appMode: 'home' | 'residential' | 'corporate';
  viewMode?: 'dashboard' | 'apartment' | 'goals' | 'team' | 'accessibility' | 'leaderboard' | 'global' | 'profile';
  apartmentId?: string | null;
}

interface UseNavigationHistoryOptions {
  state: NavigationState;
  onNavigate: (state: NavigationState) => void;
}

/**
 * Hook to sync app navigation state with browser history
 * This allows the back button to work within the app
 */
export function useNavigationHistory({ state, onNavigate }: UseNavigationHistoryOptions) {
  const isInitialized = useRef(false);
  const isProgrammaticNavigation = useRef(false);

  // Push state to history when navigation changes
  const pushState = useCallback((newState: NavigationState) => {
    isProgrammaticNavigation.current = true;

    // Create a unique key for this state
    const stateKey = `${newState.appMode}-${newState.viewMode || ''}-${newState.apartmentId || ''}`;

    // Only push if different from current
    const currentStateKey = window.history.state?.stateKey;
    if (currentStateKey !== stateKey) {
      window.history.pushState(
        { ...newState, stateKey },
        '',
        window.location.pathname
      );
    }

    isProgrammaticNavigation.current = false;
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isProgrammaticNavigation.current) return;

      const historyState = event.state as NavigationState | null;

      if (historyState) {
        // Navigate to the state from history
        onNavigate(historyState);
      } else {
        // No state means we're at the initial entry - go to home
        onNavigate({ appMode: 'home' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigate]);

  // Initialize history state on mount
  useEffect(() => {
    if (!isInitialized.current) {
      // Replace current state with initial app state
      window.history.replaceState(
        { ...state, stateKey: 'initial' },
        '',
        window.location.pathname
      );
      isInitialized.current = true;
    }
  }, []);

  // Push new state when navigation changes (after initialization)
  useEffect(() => {
    if (isInitialized.current && !isProgrammaticNavigation.current) {
      pushState(state);
    }
  }, [state.appMode, state.viewMode, state.apartmentId, pushState]);

  return { pushState };
}
