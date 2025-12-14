/**
 * App.tsx - Main application component with auth-based routing
 * Requirements: 1.2, 3.4
 */

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useNavigationHistory, type NavigationState } from './hooks/useNavigationHistory';

// Auth Provider and Components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PhoneLoginScreen from './components/auth/PhoneLoginScreen';
import OTPVerificationScreen from './components/auth/OTPVerificationScreen';
import ProfileSetupScreen from './components/auth/ProfileSetupScreen';
import TeamCodeScreen from './components/auth/TeamCodeScreen';

// Core Components (always loaded)
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import Modal from './components/ui/Modal';
import HomeScreen from './components/HomeScreen';
import AdminDashboard from './components/AdminDashboard';
import Confetti from './components/ui/Confetti';
import SwipeTutorial, { useSwipeTutorial } from './components/ui/SwipeTutorial';

// Lazy loaded components
const ApartmentView = lazy(() => import('./components/ApartmentView'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const RoomModal = lazy(() => import('./components/RoomModal'));
const CorporateApp = lazy(() => import('./components/corporate/CorporateApp'));
const OnboardingTutorial = lazy(() => import('./components/OnboardingTutorial'));
const GoalTracker = lazy(() => import('./components/GoalTracker'));
const TeamPanel = lazy(() => import('./components/TeamPanel'));
const AccessibilityPanel = lazy(() => import('./components/AccessibilityPanel'));
const LeaderboardView = lazy(() => import('./components/LeaderboardView'));
const GlobalDashboard = lazy(() => import('./components/GlobalDashboard'));
const DailyChallengesUI = React.lazy(() => import('./components/DailyChallengesUI'));
const VolunteerProfileView = React.lazy(() => import('./components/VolunteerProfileView'));
const MilestoneCelebration = React.lazy(() => import('./components/MilestoneCelebration'));


// Loading fallback
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

// Full screen loading for auth
const AuthLoadingScreen = () => {
  const [showOptions, setShowOptions] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const { resetAuth, retryAuth, error } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setShowOptions(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Track loading time
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setShowOptions(false);
    setLoadingTime(0);
    await retryAuth();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center p-6 max-w-sm">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        {!showOptions ? (
          <>
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 mt-4">Loading...</p>
          </>
        ) : (
          <>
            {error ? (
              <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">{error}</p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                {loadingTime > 10
                  ? "This is taking longer than expected. Your connection might be slow."
                  : "Still loading..."}
              </p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Retry
              </button>

              <button
                onClick={resetAuth}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              >
                Start Fresh
              </button>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              If the problem persists, try checking your internet connection.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// Services & Types
import {
  loadApartments,
  saveApartments,
  createNewApartment,
  updateRoomInApartment,
  resizeApartment,
  exportToCSV
} from './services/storageService';
import { loadCampaigns } from './services/corporateStorageService';
import { initAccessibility } from './services/accessibilityService';
import { Apartment, Room, AppMode } from './types';

// Supabase services for real-time sync
import {
  getApartments as getSupabaseApartments,
  getRoomsByApartment,
  subscribeToApartments,
  subscribeToRooms,
  type SupabaseApartment,
  type SupabaseRoom
} from './services/supabase/residentialService';
import {
  initializeSyncHandlers,
  syncUpdateRoom,
  syncCreateApartment,
  syncDeleteApartment
} from './services/syncService';
import { initializeConnectionHandling } from './utils/offlineQueue';
import {
  subscribeToTeam,
  unsubscribeFromTeam,
  onConnectionStateChange,
  type ConnectionState
} from './services/supabase/realtimeService';

const ONBOARDING_KEY = 'doorstep_onboarding_complete';

/**
 * Converts Supabase apartment format to local Apartment format
 */
function convertSupabaseApartment(apt: SupabaseApartment, rooms: SupabaseRoom[]): Apartment {
  // Group rooms by floor
  const roomsByFloor: Record<string, Room[]> = {};

  rooms.forEach(room => {
    const floorKey = String(room.floor);
    if (!roomsByFloor[floorKey]) {
      roomsByFloor[floorKey] = [];
    }
    roomsByFloor[floorKey].push({
      id: room.id,
      roomNumber: room.room_number,
      visitorName: room.visitor_name || '',
      remark: room.remark || '',
      status: room.status,
      note: room.note || '',
      updatedAt: room.updated_at ? new Date(room.updated_at).getTime() : null,
      amountDonated: room.amount_donated,
      donorPhone: room.donor_phone || undefined,
      donorEmail: room.donor_email || undefined,
      donorAddress: room.donor_address || undefined,
      donorPAN: room.donor_pan || undefined,
      receiptNumber: room.receipt_number || undefined,
      paymentMode: room.payment_mode || undefined,
      supportsCount: room.supports_count,
      collectedBy: room.collected_by || undefined,
      enteredBy: room.entered_by || undefined,
    });
  });

  return {
    id: apt.id,
    name: apt.name,
    floors: apt.floors,
    unitsPerFloor: apt.units_per_floor,
    createdAt: new Date(apt.created_at).getTime(),
    targetAmount: apt.target_amount,
    rooms: roomsByFloor,
  };
}

/**
 * AuthenticatedApp - Main app content shown after authentication
 * Requirements: 9.2 - Real-time subscriptions on mount
 */
function AuthenticatedApp() {
  const { currentTeam, user, profile } = useAuth();

  // Check if user has admin role (dev, owner, bdm)
  const isAdminRole = profile?.role && ['dev', 'owner', 'bdm'].includes(profile.role);

  // --- App Mode State ---
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  // --- Residential State ---
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);

  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'apartment' | 'goals' | 'team' | 'accessibility' | 'leaderboard' | 'global' | 'profile'>('dashboard');

  // --- Milestone State ---
  const [showMilestone, setShowMilestone] = useState<{ type: 'level_up' | 'achievement', title: string, description: string, level?: number } | null>(null);
  const previousLevelRef = useRef<number | null>(null);

  // --- Browser History Navigation ---
  // This enables the back button to navigate within the app instead of closing it
  const handleHistoryNavigation = useCallback((navState: NavigationState) => {
    setAppMode(navState.appMode);
    if (navState.viewMode) {
      setViewMode(navState.viewMode);
    }
    if (navState.apartmentId !== undefined) {
      setSelectedApartmentId(navState.apartmentId);
    }
  }, []);

  useNavigationHistory({
    state: {
      appMode,
      viewMode: appMode === 'residential' ? viewMode : undefined,
      apartmentId: appMode === 'residential' ? selectedApartmentId : undefined,
    },
    onNavigate: handleHistoryNavigation,
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday'>('all');

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{ roomId: string, floor: string, apartmentId: string } | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  // Celebration state
  const [showConfetti, setShowConfetti] = useState(false);

  // Swipe tutorial for mobile
  const { showTutorial: showSwipeTutorial, dismissTutorial } = useSwipeTutorial();

  // Connection state for real-time sync
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(false);

  // --- Effects ---

  // Initialize app (no localStorage loading - we use Supabase as source of truth)
  useEffect(() => {
    initAccessibility(); // Initialize accessibility settings
    initializeSyncHandlers(); // Register sync handlers
    const cleanupConnection = initializeConnectionHandling(); // Listen for offline/online

    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    // Don't load from localStorage - Supabase is the source of truth
    // localStorage is only used for offline queue, not as primary data store

    return () => {
      cleanupConnection();
    };
  }, []);

  // Load data from Supabase when team is available
  // Requirements: 9.2 - Subscribe to real-time updates on mount
  useEffect(() => {
    if (!currentTeam) return;

    let mounted = true;
    const unsubscribeFns: Array<() => Promise<void>> = [];

    // IMPORTANT: Clear existing data immediately when team changes
    // This prevents showing stale data from the previous team
    setApartments([]);
    setSelectedApartmentId(null);
    setViewMode('dashboard');

    const loadSupabaseData = async () => {
      setIsLoadingFromSupabase(true);
      try {
        // Fetch apartments from Supabase
        const result = await getSupabaseApartments(currentTeam.id);

        if (result.success && result.apartments && mounted) {
          // Load rooms for each apartment
          const apartmentsWithRooms: Apartment[] = [];

          for (const apt of result.apartments) {
            const roomsResult = await getRoomsByApartment(apt.id);
            if (roomsResult.success && roomsResult.rooms) {
              apartmentsWithRooms.push(convertSupabaseApartment(apt, roomsResult.rooms));
            }
          }

          if (mounted) {
            // Always set apartments from Supabase (even if empty) - this is the source of truth
            setApartments(apartmentsWithRooms);
          }
        }
      } catch (err) {
        console.error('Error loading from Supabase:', err);
        // On error, keep current state (don't clear)
      } finally {
        if (mounted) {
          setIsLoadingFromSupabase(false);
        }
      }
    };

    // Subscribe to team channel for real-time updates
    subscribeToTeam(currentTeam.id);

    // Subscribe to apartment changes
    const unsubApartments = subscribeToApartments(currentTeam.id, (payload) => {
      if (!mounted) return;

      if (payload.eventType === 'INSERT' && payload.new) {
        // New apartment added - fetch its rooms and add to state
        const newApt = payload.new as SupabaseApartment;
        getRoomsByApartment(newApt.id).then(roomsResult => {
          if (roomsResult.success && roomsResult.rooms && mounted) {
            const converted = convertSupabaseApartment(newApt, roomsResult.rooms);
            setApartments(prev => [converted, ...prev.filter(a => a.id !== newApt.id)]);
          }
        });
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // Apartment updated - update in state
        const updatedApt = payload.new as SupabaseApartment;
        setApartments(prev => prev.map(apt => {
          if (apt.id === updatedApt.id) {
            return {
              ...apt,
              name: updatedApt.name,
              floors: updatedApt.floors,
              unitsPerFloor: updatedApt.units_per_floor,
              targetAmount: updatedApt.target_amount,
            };
          }
          return apt;
        }));
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Apartment deleted - remove from state
        const deletedApt = payload.old as SupabaseApartment;
        setApartments(prev => prev.filter(apt => apt.id !== deletedApt.id));
      }
    });
    unsubscribeFns.push(unsubApartments);

    // Listen for connection state changes
    const unsubConnection = onConnectionStateChange((state) => {
      if (mounted) {
        setConnectionState(state);
      }
    });

    // Load initial data
    loadSupabaseData();

    return () => {
      mounted = false;
      // Cleanup subscriptions
      unsubscribeFns.forEach(fn => fn());
      unsubscribeFromTeam(currentTeam.id);
    };
  }, [currentTeam]);

  // Calculate stats for home screen
  const residentialStats = useMemo(() => {
    let totalRaised = 0;
    apartments.forEach(apt => {
      Object.values(apt.rooms).forEach((floor: Room[]) => {
        floor.forEach(room => {
          if (room.status === 'donated') totalRaised += (room.amountDonated || 0);
        });
      });
    });
    return { campaigns: apartments.length, totalRaised };
  }, [apartments]);

  const corporateStats = useMemo(() => {
    const campaigns = loadCampaigns();
    let totalRaised = 0;
    campaigns.forEach(c => {
      c.businesses.forEach(b => {
        if (b.status === 'donated') totalRaised += (b.amountDonated || 0);
      });
    });
    return { campaigns: campaigns.length, totalRaised };
  }, [appMode]); // Recalculate when switching modes

  useEffect(() => {
    if (apartments.length > 0) {
      saveApartments(apartments);
    }
  }, [apartments]);

  useEffect(() => {
    setSearchQuery('');
    setSelectedFloor(null);
    setTimeFilter('all');
  }, [selectedApartmentId]);

  // --- Actions ---
  const handleCreateApartment = async (name: string, floors: number, units: number, target: number) => {
    if (!currentTeam) {
      alert('Please select a team first');
      return;
    }

    // Create directly in Supabase - it will trigger real-time update to add to state
    try {
      const result = await syncCreateApartment(currentTeam.id, {
        name,
        floors,
        units_per_floor: units,
        target_amount: target
      });

      if (result.success) {
        if ('apartment' in result && result.apartment) {
          // Online success - the real-time subscription will add it to state
          // but we can also set selection immediately for better UX
          setSelectedApartmentId(result.apartment.id);
          setViewMode('apartment');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        } else if ('queued' in result && result.queued) {
          // Offline - create local placeholder
          const tempApt = createNewApartment(name, floors, units, target);
          setApartments(prev => [tempApt, ...prev]);
          setSelectedApartmentId(tempApt.id);
          setViewMode('apartment');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error('Error creating apartment:', err);
      alert('Failed to create campaign. Please try again.');
    }
  };

  const handleDeleteApartment = (id: string) => {
    if (confirm("Delete this apartment and all data? This cannot be undone.")) {
      setApartments(prev => prev.filter(a => a.id !== id));
      if (selectedApartmentId === id) {
        setSelectedApartmentId(null);
        setViewMode('dashboard');
      }

      // Sync delete
      syncDeleteApartment(id);
    }
  };

  const handleUpdateRoom = (roomId: string, updates: Partial<Room>) => {
    if (!editingRoom) return;

    // Check if this is a new donation to trigger confetti
    const currentRoom = activeApartment?.rooms[editingRoom.floor]?.find(r => r.id === roomId);
    const isNewDonation = updates.status === 'donated' && currentRoom?.status !== 'donated';

    const updatedApts = updateRoomInApartment(
      apartments,
      editingRoom.apartmentId,
      editingRoom.floor,
      roomId,
      updates
    );
    setApartments(updatedApts);
    setEditingRoom(null);

    // Trigger confetti for donations!
    if (isNewDonation) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    // Sync Update
    syncUpdateRoom(roomId, updates);
  };

  // Quick resume from home screen
  const handleQuickResume = useCallback((apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setAppMode('residential');
    setViewMode('apartment');
  }, []);

  // Back Navigation Handler
  const handleBack = useCallback(() => {
    if (viewMode === 'apartment' && selectedApartmentId) {
      // If we are in apartment view, go back to dashboard
      setSelectedApartmentId(null);
      setViewMode('dashboard');
    } else {
      // Otherwise go back to Home Screen
      setAppMode('home');
    }
  }, [viewMode, selectedApartmentId]);

  // --- Derived State ---
  const activeApartment = useMemo(() =>
    apartments.find(a => a.id === selectedApartmentId),
    [apartments, selectedApartmentId]);

  const activeRoom = useMemo(() => {
    if (!activeApartment || !editingRoom) return null;
    return activeApartment.rooms[editingRoom.floor]?.find(r => r.id === editingRoom.roomId);
  }, [activeApartment, editingRoom]);

  // --- Render ---

  // Onboarding Tutorial (first time users)
  if (showOnboarding) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingTutorial onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  // Home Screen - Role-based landing
  if (appMode === 'home') {
    return (
      <>

        {/* Admin roles (dev, owner, bdm) see AdminDashboard with Sidebar */}
        {isAdminRole ? (
          <Layout
            isSidebarOpen={isSidebarOpen}
            onSidebarClose={() => setIsSidebarOpen(false)}
            sidebar={
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onGoHome={() => setAppMode('home')}
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedApartmentId={selectedApartmentId}
                onSelectApartment={(id) => {
                  setSelectedApartmentId(id);
                  if (id) {
                    setViewMode('apartment');
                    setAppMode('residential');
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }
                }}
                apartments={apartments}
                onCreateApartment={handleCreateApartment}
                onDeleteApartment={handleDeleteApartment}
                onExportCSV={() => exportToCSV(apartments)}
                connectionState={connectionState}
              />
            }
          >
            <MobileHeader
              title={viewMode === 'global' ? 'Global Overview' :
                viewMode === 'leaderboard' ? 'Leaderboard' :
                  viewMode === 'goals' ? 'Goals' :
                    viewMode === 'team' ? 'Team' :
                      viewMode === 'accessibility' ? 'Accessibility' :
                        viewMode === 'profile' ? 'My Profile' :
                          'Admin Dashboard'}
              subtitle={currentTeam?.name}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            {viewMode === 'global' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Global Overview</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all teams across the organization.</p>
                </div>
                <div className="p-4 md:p-8">
                  <Suspense fallback={<LoadingFallback />}>
                    <GlobalDashboard onInspectTeam={() => setViewMode('dashboard')} />
                  </Suspense>
                </div>
              </div>
            ) : viewMode === 'leaderboard' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Leaderboard</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Top performers across your team.</p>
                </div>
                <div className="p-4 md:p-8">
                  <Suspense fallback={<LoadingFallback />}>
                    <LeaderboardView apartments={apartments} />
                  </Suspense>
                </div>
              </div>
            ) : viewMode === 'goals' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Goals & Achievements</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Track your daily targets and streaks.</p>
                </div>
                <div className="p-4 md:p-8 max-w-2xl mx-auto">
                  <Suspense fallback={<LoadingFallback />}>
                    <DailyChallengesUI />
                    <div className="mt-8">
                      <GoalTracker />
                    </div>
                  </Suspense>
                </div>
              </div>
            ) : viewMode === 'team' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Team Collaboration</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Manage volunteers and share data.</p>
                </div>
                <div className="p-4 md:p-8 max-w-2xl mx-auto">
                  <Suspense fallback={<LoadingFallback />}>
                    <TeamPanel />
                  </Suspense>
                </div>
              </div>
            ) : viewMode === 'accessibility' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Accessibility Settings</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Customize the app for better usability.</p>
                </div>
                <div className="p-4 md:p-8 max-w-2xl mx-auto">
                  <Suspense fallback={<LoadingFallback />}>
                    <AccessibilityPanel />
                  </Suspense>
                </div>
              </div>
            ) : viewMode === 'profile' ? (
              <div className="h-full overflow-y-auto">
                <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">My Profile</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">View your progress and stats.</p>
                </div>
                <div className="p-4 md:p-8 max-w-2xl mx-auto">
                  <Suspense fallback={<LoadingFallback />}>
                    <VolunteerProfileView />
                  </Suspense>
                </div>
              </div>
            ) : (
              <AdminDashboard
                onSelectMode={setAppMode}
                apartments={apartments}
                onQuickResume={handleQuickResume}
              />
            )}
          </Layout>
        ) : (
          /* Team leaders and members see HomeScreen */
          <HomeScreen
            onSelectMode={setAppMode}
            residentialStats={residentialStats}
            corporateStats={corporateStats}
            apartments={apartments}
            onQuickResume={handleQuickResume}
          />
        )}
      </>
    );
  }

  // Corporate Mode
  if (appMode === 'corporate') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CorporateApp onGoHome={() => setAppMode('home')} />
      </Suspense>
    );
  }

  // Residential Mode (existing code)
  return (
    <>
      {/* Confetti celebration */}
      <Confetti isActive={showConfetti} />

      {/* Swipe tutorial for mobile */}
      {showSwipeTutorial && window.innerWidth < 640 && (
        <SwipeTutorial onDismiss={dismissTutorial} />
      )}

      {/* Milestone Celebration */}
      {showMilestone && (
        <Suspense fallback={null}>
          <MilestoneCelebration
            {...showMilestone}
            onClose={() => setShowMilestone(null)}
          />
        </Suspense>
      )}

      <Layout
        isSidebarOpen={isSidebarOpen}
        onSidebarClose={() => setIsSidebarOpen(false)}
        sidebar={
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onGoHome={() => setAppMode('home')}
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedApartmentId={selectedApartmentId}
            onSelectApartment={(id) => {
              setSelectedApartmentId(id);
              if (id) {
                setViewMode('apartment');
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }
            }}
            apartments={apartments}
            onCreateApartment={handleCreateApartment}
            onDeleteApartment={handleDeleteApartment}
            onExportCSV={() => exportToCSV(apartments)}
            connectionState={connectionState}
          />
        }
      >
        <MobileHeader
          title={
            viewMode === 'dashboard' ? 'Dashboard' :
              viewMode === 'goals' ? 'Goals & Streaks' :
                viewMode === 'team' ? 'Team & Share' :
                  viewMode === 'leaderboard' ? 'Leaderboard' :
                    viewMode === 'global' ? 'Global Overview' :
                      viewMode === 'accessibility' ? 'Accessibility' :
                        viewMode === 'profile' ? 'My Profile' :
                          activeApartment?.name || 'DoorStep'
          }
          subtitle={activeApartment && viewMode === 'apartment' ? `${activeApartment.floors} Floors • ${activeApartment.unitsPerFloor} Units` : undefined}
          onMenuClick={() => setIsSidebarOpen(true)}
          onSettingsClick={activeApartment && viewMode === 'apartment' ? () => setEditingApartment(activeApartment) : undefined}
          showSearch={viewMode === 'apartment' && !!activeApartment}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
        />

        {viewMode === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
            {/* Desktop Dashboard Header */}
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Campaign Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time insights across your fundraising locations.</p>
            </div>
            <div className="p-4 md:p-8">
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard
                  apartments={apartments}
                  onRoomClick={(roomId, floor, apartmentId) => {
                    setSelectedApartmentId(apartmentId);
                    setViewMode('apartment');
                    setEditingRoom({ roomId, floor, apartmentId });
                  }}
                  onCreateCampaign={() => setIsSidebarOpen(true)}
                />
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'goals' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Goals & Achievements</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Track your daily targets, streaks, and unlock badges.</p>
            </div>
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
              <Suspense fallback={<LoadingFallback />}>
                <DailyChallengesUI />
                <div className="mt-8">
                  <GoalTracker />
                </div>
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'team' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Team Collaboration</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage volunteers and share campaign data.</p>
            </div>
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
              <Suspense fallback={<LoadingFallback />}>
                <TeamPanel />
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'leaderboard' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Leaderboard</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Recognize top performers and team achievements.</p>
            </div>
            <div className="p-4 md:p-8">
              <Suspense fallback={<LoadingFallback />}>
                <LeaderboardView apartments={apartments} />
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'global' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Global Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all teams across the organization.</p>
            </div>
            <div className="p-4 md:p-8">
              <Suspense fallback={<LoadingFallback />}>
                <GlobalDashboard onInspectTeam={() => setViewMode('dashboard')} />
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'accessibility' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Accessibility Settings</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Customize the app for better usability.</p>
            </div>
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
              <Suspense fallback={<LoadingFallback />}>
                <AccessibilityPanel />
              </Suspense>
            </div>
          </div>
        ) : viewMode === 'profile' ? (
          <div className="h-full overflow-y-auto">
            <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">My Profile</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">View your progress and stats.</p>
            </div>
            <div className="p-4 md:p-8">
              <Suspense fallback={<LoadingFallback />}>
                <VolunteerProfileView />
              </Suspense>
            </div>
          </div>
        ) : activeApartment ? (
          <Suspense fallback={<LoadingFallback />}>
            <ApartmentView
              apartment={activeApartment}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              selectedFloor={selectedFloor}
              setSelectedFloor={setSelectedFloor}
              onEditApartment={() => setEditingApartment(activeApartment)}
              onRoomClick={(roomId, floor, apartmentId) => setEditingRoom({ roomId, floor, apartmentId })}
              onQuickStatusChange={(roomId, floor, status) => {
                const updatedApts = updateRoomInApartment(apartments, activeApartment.id, floor, roomId, { status });
                setApartments(updatedApts);
              }}
              onDonation={() => {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 100);
              }}
            />
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200 dark:shadow-black/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600 rotate-3 transform hover:rotate-6 transition-transform">
                {/* Just a placeholder icon or illustration */}
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Campaign Selected</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Choose an apartment from the sidebar to view details, or create a new campaign to get started.
              </p>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all"
              >
                Browse Apartments
              </button>
            </div>
          </div>
        )}

        {/* Room Modal */}
        {editingRoom && activeRoom && (
          <Suspense fallback={null}>
            <RoomModal
              room={activeRoom}
              apartmentId={editingRoom.apartmentId}
              floor={Number(editingRoom.floor)}
              isOpen={!!editingRoom}
              onClose={() => setEditingRoom(null)}
              onSave={handleUpdateRoom}
            />
          </Suspense>
        )}



        {/* Edit Apartment Structure Modal */}
        {editingApartment && (
          <Modal
            isOpen={!!editingApartment}
            onClose={() => setEditingApartment(null)}
            title="Edit Structure"
          >
            <div className="space-y-4">
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                Warning: Reducing floors or units will permanently delete data in those removed sections.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Building Name</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  value={editingApartment.name}
                  onChange={e => setEditingApartment({ ...editingApartment, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Floors</label>
                  <input
                    type="number" className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    value={editingApartment.floors}
                    onChange={e => setEditingApartment({ ...editingApartment, floors: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Units/Floor</label>
                  <input
                    type="number" className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    value={editingApartment.unitsPerFloor}
                    onChange={e => setEditingApartment({ ...editingApartment, unitsPerFloor: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  Map Location
                </label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="text-xs text-slate-400">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 12.9716"
                      className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      value={editingApartment.latitude || ''}
                      onChange={e => setEditingApartment({ ...editingApartment, latitude: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 77.5946"
                      className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      value={editingApartment.longitude || ''}
                      onChange={e => setEditingApartment({ ...editingApartment, longitude: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setEditingApartment({
                            ...editingApartment,
                            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
                            longitude: parseFloat(pos.coords.longitude.toFixed(6))
                          });
                        },
                        (err) => {
                          alert('Could not get location: ' + err.message);
                        }
                      );
                    } else {
                      alert('Geolocation is not supported by this browser.');
                    }
                  }}
                  className="mt-3 w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></svg>
                  Use My Current Location
                </button>
              </div>

              <button
                onClick={() => {
                  const updated = resizeApartment(apartments, editingApartment.id, editingApartment.name, editingApartment.floors, editingApartment.unitsPerFloor, editingApartment.targetAmount, editingApartment.latitude, editingApartment.longitude);
                  setApartments(updated);
                  setEditingApartment(null);
                }}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold"
              >
                Save Changes
              </button>
            </div>
          </Modal>
        )}

      </Layout>

      {/* Vercel Analytics */}
      <Analytics />
    </>
  );
}

/**
 * AppRouter - Handles auth-based routing
 * Requirements: 1.2, 3.4
 */
function AppRouter() {
  const { authStep, isLoading } = useAuth();

  // Show loading screen while checking auth state
  if (isLoading || authStep === 'loading') {
    return <AuthLoadingScreen />;
  }

  // Route based on auth step
  switch (authStep) {
    case 'unauthenticated':
      return <PhoneLoginScreen />;

    case 'verifying_otp':
      return <OTPVerificationScreen />;

    case 'profile_setup':
      return <ProfileSetupScreen />;

    case 'team_join':
      return <TeamCodeScreen />;

    case 'authenticated':
      return <AuthenticatedApp />;

    default:
      return <AuthLoadingScreen />;
  }
}

/**
 * App - Root component wrapped with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
