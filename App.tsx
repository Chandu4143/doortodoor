import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';

// Core Components (always loaded)
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import Modal from './components/ui/Modal';
import HomeScreen from './components/HomeScreen';
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

// Loading fallback
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

// Services & Types
import {
  loadApartments,
  saveApartments,
  createNewApartment,
  updateRoomInApartment,
  resizeApartment,
  exportToCSV,
  validateAndParseImport
} from './services/storageService';
import { loadCampaigns } from './services/corporateStorageService';
import { initAccessibility } from './services/accessibilityService';
import { Apartment, Room, AppMode } from './types';

const ONBOARDING_KEY = 'doorstep_onboarding_complete';

function App() {
  // --- App Mode State ---
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  // --- Residential State ---
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'apartment' | 'goals' | 'team' | 'accessibility'>('dashboard');

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday'>('all');

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{ roomId: string, floor: string, apartmentId: string } | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  
  // Celebration state
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Swipe tutorial for mobile
  const { showTutorial: showSwipeTutorial, dismissTutorial } = useSwipeTutorial();

  // --- Effects ---
  useEffect(() => {
    setApartments(loadApartments());
    initAccessibility(); // Initialize accessibility settings
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

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
  const handleCreateApartment = (name: string, floors: number, units: number, target: number) => {
    const newApt = createNewApartment(name, floors, units, target);
    setApartments(prev => [newApt, ...prev]);
    setSelectedApartmentId(newApt.id);
    setViewMode('apartment');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteApartment = (id: string) => {
    if (confirm("Delete this apartment and all data? This cannot be undone.")) {
      setApartments(prev => prev.filter(a => a.id !== id));
      if (selectedApartmentId === id) {
        setSelectedApartmentId(null);
        setViewMode('dashboard');
      }
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
    
    // Trigger confetti for donations!
    if (isNewDonation) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
  };
  
  // Quick resume from home screen
  const handleQuickResume = useCallback((apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setAppMode('residential');
    setViewMode('apartment');
  }, []);

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!confirm("This will OVERWRITE your current data with the backup file. Are you sure?")) {
        return;
      }
      const importedData = await validateAndParseImport(file);
      setApartments(importedData);
      saveApartments(importedData);
      alert("Data restored successfully!");
      setShowDataModal(false);
    } catch (err: any) {
      alert("Import failed: " + err.message);
    }
  };

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
  
  // Home Screen
  if (appMode === 'home') {
    return (
      <HomeScreen
        onSelectMode={setAppMode}
        residentialStats={residentialStats}
        corporateStats={corporateStats}
        apartments={apartments}
        onQuickResume={handleQuickResume}
      />
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
          onOpenRestoration={() => setShowDataModal(true)}
        />
      }
    >
      <MobileHeader
        title={
          viewMode === 'dashboard' ? 'Dashboard' : 
          viewMode === 'goals' ? 'Goals & Streaks' :
          viewMode === 'team' ? 'Team & Share' :
          viewMode === 'accessibility' ? 'Accessibility' :
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
              <GoalTracker apartments={apartments} />
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
              <TeamPanel 
                apartments={apartments} 
                onImportData={(imported) => {
                  if (confirm('This will add imported campaigns to your existing data. Continue?')) {
                    setApartments(prev => [...prev, ...imported]);
                  }
                }}
              />
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
            isOpen={!!editingRoom}
            onClose={() => setEditingRoom(null)}
            onSave={handleUpdateRoom}
          />
        </Suspense>
      )}

      {/* Restore Data Modal */}
      <Modal
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        title="Backup & Restore"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Safeguard your data by exporting it regularly. You can restore it anytime by uploading the backup file.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
              <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Restore from File</span>
            </label>

            {/* Note: Export is usually in sidebar but good to have here too maybe? Or just keep restoration here to limit scope */}
            {/* We only put restoration here as per original design intention for this specific modal use-case usually */}
          </div>
        </div>
      </Modal>

      {/* Edit Apartment Structure Modal - Simplified for now, or use similar pattern */}
      {/* For brevity, I am not refactoring specific Resize/Edit logic deeply, assuming it's rare action. 
          But if functionality is needed, I should add it. I will skip providing the actual implementation logic for resize in this turn to save space unless requested, 
          but wait, I removed the original. I should add a simple Modal for it if needed. 
          The original App.tsx had 'handleResizeApartment'. I should include that logic or similar. 
      */}
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
            {/* Input fields would go here matching original logic. I'll implement a basic version. */}
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
            <button
              onClick={() => {
                const updated = resizeApartment(apartments, editingApartment.id, editingApartment.name, editingApartment.floors, editingApartment.unitsPerFloor, editingApartment.targetAmount);
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
    </>
  );
}

export default App;