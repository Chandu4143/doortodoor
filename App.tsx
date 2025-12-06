import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Building2, 
  LayoutGrid, 
  Menu,
  Home,
  ChevronLeft,
  Settings,
  X,
  AlertTriangle,
  Search,
  WifiOff,
  Clock,
  Calendar,
  Filter
} from 'lucide-react';

// Components
import RoomModal from './components/RoomModal';
import Dashboard from './components/Dashboard';

// Services & Types
import { 
  loadApartments, 
  saveApartments, 
  createNewApartment, 
  updateRoomInApartment,
  resizeApartment,
  exportToCSV 
} from './services/storageService';
import { Apartment, Room } from './types';
import { STATUS_CONFIG } from './constants';

function App() {
  // --- State ---
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'apartment'>('dashboard');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  
  // Modal State
  const [editingRoom, setEditingRoom] = useState<{ roomId: string, floor: string, apartmentId: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile

  // New Apartment Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAptName, setNewAptName] = useState('');
  const [newFloors, setNewFloors] = useState(5);
  const [newUnits, setNewUnits] = useState(4);

  // Edit Apartment Modal
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- Effects ---
  useEffect(() => {
    setApartments(loadApartments());
    
    // Offline detection listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Open sidebar by default on larger screens
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (apartments.length > 0) {
      saveApartments(apartments);
    }
  }, [apartments]);

  // Clear search and floor selection when changing apartments
  useEffect(() => {
    setSearchQuery('');
    setSelectedFloor(null);
    setTimeFilter('all');
  }, [selectedApartmentId]);

  // --- Actions ---
  const handleCreateApartment = () => {
    if (!newAptName.trim()) return;
    const newApt = createNewApartment(newAptName, newFloors, newUnits);
    setApartments(prev => [newApt, ...prev]);
    setNewAptName('');
    setShowCreateForm(false);
    setSelectedApartmentId(newApt.id);
    setViewMode('apartment');
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteApartment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    const updatedApts = updateRoomInApartment(
      apartments, 
      editingRoom.apartmentId, 
      editingRoom.floor, 
      roomId, 
      updates
    );
    setApartments(updatedApts);
  };

  const handleResizeApartment = () => {
    if (!editingApartment) return;
    
    // Check constraints
    if (editingApartment.floors < 1 || editingApartment.unitsPerFloor < 1) {
      alert("Floors and units must be at least 1.");
      return;
    }

    const updatedApts = resizeApartment(
      apartments,
      editingApartment.id,
      editingApartment.name,
      editingApartment.floors,
      editingApartment.unitsPerFloor
    );

    setApartments(updatedApts);
    setEditingApartment(null); // Close modal
  };

  const handleNavClick = (id: string) => {
    setSelectedApartmentId(id);
    setViewMode('apartment');
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDashboardClick = () => {
    setViewMode('dashboard');
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
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

  const sortedFloors = useMemo(() => {
    if (!activeApartment) return [];
    return Object.keys(activeApartment.rooms).sort((a, b) => Number(b) - Number(a));
  }, [activeApartment]);

  // --- Helpers ---
  const checkTimeFilter = (timestamp: number | null) => {
    if (timeFilter === 'all') return true;
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (timeFilter === 'today') {
      return date.toDateString() === now.toDateString();
    }
    
    if (timeFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();
    }
    
    return true;
  };

  const formatVisitTime = (timestamp: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };


  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-xs font-bold text-center py-1 px-4 shadow-md flex items-center justify-center gap-2">
          <WifiOff size={14} />
          You are offline. Changes are saved to your device and will sync when connection returns.
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 transition-opacity duration-300 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/60 shadow-2xl flex flex-col transition-all duration-300 ease-in-out
          md:relative md:shadow-none
          ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full w-80 md:w-0 md:translate-x-0 md:overflow-hidden'}
          ${!isOnline ? 'pt-6' : ''} /* Adjust for banner */
        `}
      >
        <div className="p-5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 text-slate-800 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Home size={18} strokeWidth={2.5} />
            </div>
            DoorStep
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-2 hover:bg-slate-50 rounded-lg">
            <ChevronLeft />
          </button>
        </div>

        <div className="px-4 py-2 flex-1 overflow-y-auto space-y-6">
          
          {/* Main Nav */}
          <div className="space-y-1">
            <button 
              onClick={handleDashboardClick}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${viewMode === 'dashboard' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <LayoutGrid size={20} className={viewMode === 'dashboard' ? 'text-blue-600' : 'text-slate-400'} />
              Dashboard
            </button>
          </div>

          {/* Apartments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaigns</span>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                title="Add New Apartment"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>

            {showCreateForm && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 space-y-3 shadow-inner">
                <input 
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="Building Name" 
                  autoFocus
                  value={newAptName}
                  onChange={e => setNewAptName(e.target.value)}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Floors</label>
                    <input 
                      type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={newFloors} onChange={e => setNewFloors(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Units/Flr</label>
                    <input 
                      type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={newUnits} onChange={e => setNewUnits(Number(e.target.value))}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleCreateApartment}
                  className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95"
                >
                  Create Building
                </button>
              </div>
            )}

            <div className="space-y-1">
              {apartments.length === 0 && !showCreateForm && (
                <div className="text-sm text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  No apartments yet.<br/>Click + to add one.
                </div>
              )}
              {apartments.map(apt => (
                <div 
                  key={apt.id}
                  className={`group relative flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-sm transition-all duration-200
                    ${selectedApartmentId === apt.id && viewMode === 'apartment'
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                      : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent hover:border-slate-100'}`}
                  onClick={() => handleNavClick(apt.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Building2 size={18} className={selectedApartmentId === apt.id ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-500'} />
                    <div className="flex flex-col truncate">
                       <span className="truncate font-semibold tracking-tight">{apt.name}</span>
                       <span className={`text-[10px] ${selectedApartmentId === apt.id ? 'text-slate-400' : 'text-slate-400'}`}>
                         {apt.floors} Floors
                       </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteApartment(apt.id, e)}
                    className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100
                      ${selectedApartmentId === apt.id ? 'hover:bg-slate-800 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  {/* Active Indicator Line */}
                  {selectedApartmentId === apt.id && viewMode === 'apartment' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-500 rounded-r-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
           <button 
             onClick={() => exportToCSV(apartments)}
             className="group w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider border border-slate-200 rounded-xl py-3 hover:bg-white hover:border-blue-200 hover:text-blue-600 hover:shadow-sm transition-all"
            >
             <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
             Export Data
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative w-full bg-slate-50/50 ${!isOnline ? 'pt-6' : ''}`}>
        
        {/* Mobile Header (Visible only on mobile) */}
        <div className="md:hidden flex flex-col bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform">
                <Menu size={24} />
              </button>
              <div>
                <h1 className="font-bold text-lg text-slate-800 truncate max-w-[200px] leading-tight">
                  {viewMode === 'dashboard' ? 'Dashboard' : activeApartment?.name || 'DoorStep'}
                </h1>
                {activeApartment && viewMode === 'apartment' && (
                  <p className="text-xs text-slate-500">{activeApartment.floors} Floors • {activeApartment.unitsPerFloor} Units</p>
                )}
              </div>
            </div>
            {activeApartment && viewMode === 'apartment' && (
              <button 
                onClick={() => setEditingApartment(activeApartment)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
          
          {/* Mobile Search & Filter */}
          {activeApartment && viewMode === 'apartment' && (
            <div className="px-4 pb-3 space-y-2">
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search name, room, remark..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  )}
               </div>
               
               {/* Mobile Time Filter */}
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                 {(['all', 'today', 'yesterday'] as const).map(filter => (
                   <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap border
                      ${timeFilter === filter 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-500 border-slate-200'}
                    `}
                   >
                     {filter === 'all' ? 'All Time' : filter}
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>

        {viewMode === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
             {/* Desktop Dashboard Header */}
            <div className="hidden md:block px-8 py-6 bg-white border-b border-slate-200/60 sticky top-0 z-10">
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Campaign Overview</h1>
              <p className="text-slate-500 mt-1">Real-time insights across your fundraising locations.</p>
            </div>
            <div className="p-4 md:p-8">
               <Dashboard apartments={apartments} />
            </div>
          </div>
        ) : activeApartment ? (
          <div className="h-full flex flex-col">
            
            {/* Desktop Apartment Header */}
            <div className="hidden md:flex bg-white px-8 py-5 items-center justify-between shrink-0 border-b border-slate-200/60 shadow-sm z-10 relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{activeApartment.name}</h1>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeApartment.floors} Floors • {Object.values(activeApartment.rooms).flat().length} Units Total
                  </p>
                </div>
                <button 
                  onClick={() => setEditingApartment(activeApartment)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-2"
                  title="Edit Apartment Structure"
                >
                  <Settings size={18} />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                
                {/* Time Filter */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                  {(['all', 'today', 'yesterday'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all
                        ${timeFilter === filter 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'}
                      `}
                    >
                      {filter === 'all' ? 'All' : filter}
                    </button>
                  ))}
                </div>

                <div className="w-px h-8 bg-slate-200"></div>

                {/* Desktop Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Find unit..."
                    className="w-48 focus:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X size={14} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Stats Scroller */}
            <div className="md:hidden bg-white px-4 py-3 border-b border-slate-100 flex overflow-x-auto gap-3 no-scrollbar shrink-0 shadow-sm z-10">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                   const count = (Object.values(activeApartment.rooms).flat() as Room[]).filter(r => r.status === key).length;
                   return (
                     <div key={key} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 bg-white shadow-sm ${config.color.replace('text', 'border-')}`}>
                        <div className={`w-2 h-2 rounded-full ${config.color.replace('text', 'bg-')}`}></div>
                        {config.label} <span className="opacity-60">({count})</span>
                     </div>
                   )
                })}
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              
              {/* Responsive Floor Selector (Hidden if searching) */}
              <div className={`
                ${searchQuery || timeFilter !== 'all' ? 'hidden' : 'flex'}
                w-full md:w-20 
                bg-white md:bg-white
                border-b md:border-b-0 md:border-r border-slate-200/60 
                flex-row md:flex-col 
                items-center 
                overflow-x-auto md:overflow-y-auto 
                shrink-0 
                gap-2 p-2 md:py-6
                no-scrollbar
                z-10
                transition-all
              `}>
                <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Floor</span>
                
                <button
                   className={`
                    w-auto md:w-12 h-9 md:h-12 px-4 md:px-0 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shrink-0
                    ${selectedFloor === null 
                      ? 'bg-slate-800 text-white shadow-md shadow-slate-200 scale-100' 
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}
                   `}
                    onClick={() => setSelectedFloor(null)}
                >
                  All
                </button>
                <div className="hidden md:block w-8 h-px bg-slate-100 my-2"></div>
                <div className="md:hidden h-6 w-px bg-slate-200 mx-1"></div>

                {sortedFloors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
                    className={`
                      w-10 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-sm font-bold transition-all shrink-0
                      ${selectedFloor === floor 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105' 
                        : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 md:border-transparent'}
                    `}
                  >
                    {floor}
                  </button>
                ))}
              </div>

              {/* Room Grid */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-50/30">
                {sortedFloors.map(floor => {
                  // Filter rooms based on search query and Time Filter
                  const floorRooms = activeApartment.rooms[floor];
                  const filteredRooms = floorRooms.filter(room => {
                    // Search Logic
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = !q || (
                      room.roomNumber.toString().includes(q) ||
                      (room.visitorName && room.visitorName.toLowerCase().includes(q)) ||
                      (room.remark && room.remark.toLowerCase().includes(q))
                    );

                    // Time Logic
                    const matchesTime = checkTimeFilter(room.updatedAt);

                    return matchesSearch && matchesTime;
                  });

                  // If filtering, and floor has no matches, skip rendering
                  if ((searchQuery || timeFilter !== 'all') && filteredRooms.length === 0) return null;

                  // If not filtering, check floor selection
                  if (!searchQuery && timeFilter === 'all' && selectedFloor !== null && selectedFloor !== floor) return null;

                  return (
                    <div key={floor} className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center gap-4 mb-4 sticky top-0 md:relative z-10 py-2 md:py-0 pl-1 md:pl-0">
                        {/* Glassmorphic Floor Header for Mobile */}
                        <div className="md:hidden absolute inset-0 bg-slate-50/90 backdrop-blur-md -mx-3 -my-2 border-b border-slate-200/50"></div>
                        <h3 className="relative text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                           Floor {floor}
                        </h3>
                        <div className="relative h-px bg-slate-200/60 flex-1"></div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 relative z-0">
                        {filteredRooms.map(room => {
                          const status = STATUS_CONFIG[room.status];
                          const Icon = status.icon;
                          const visitTime = formatVisitTime(room.updatedAt);
                          
                          return (
                            <div 
                              key={room.id}
                              onClick={() => setEditingRoom({ roomId: room.id, floor, apartmentId: activeApartment.id })}
                              className={`
                                group relative bg-white border rounded-2xl p-4 cursor-pointer transition-all duration-200
                                hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 active:scale-95 active:shadow-none
                                flex flex-col justify-between min-h-[140px]
                                ${room.status === 'unvisited' ? 'border-slate-100 hover:border-slate-300' : ''}
                                ${room.status === 'donated' ? 'border-emerald-200 bg-emerald-50/10' : ''}
                                ${room.status === 'callback' ? 'border-amber-200 bg-amber-50/10' : ''}
                                ${room.status === 'not_interested' ? 'border-red-100 bg-red-50/10' : ''}
                                ${room.status === 'other' ? 'border-slate-200 bg-slate-50/50' : ''}
                              `}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-800 text-xl tracking-tight">#{room.roomNumber}</span>
                                <div className={`p-2 rounded-xl shadow-sm ${status.bg} ${status.color.replace('text-', 'text-opacity-100 text-')} transition-transform group-hover:scale-110`}>
                                  <Icon size={20} strokeWidth={2.5} />
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                {room.visitorName ? (
                                  <p className="text-sm font-bold text-slate-700 truncate mb-1">{room.visitorName}</p>
                                ) : (
                                  <p className="text-xs text-slate-300 font-medium italic mb-1">Unknown Visitor</p>
                                )}
                                
                                {room.status === 'donated' && room.amountDonated ? (
                                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-0.5">
                                    <span className="text-[10px]">₹</span>{room.amountDonated}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 truncate font-medium min-h-[1.5em]">
                                    {room.remark}
                                  </p>
                                )}
                              </div>
                              
                              {/* Footer: Timestamp */}
                              {visitTime && (
                                <div className={`mt-3 pt-3 border-t border-slate-100/50 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide
                                  ${room.status === 'unvisited' ? 'opacity-0' : 'opacity-60'}
                                `}>
                                   <Clock size={10} />
                                   {visitTime}
                                </div>
                              )}
                              
                              {/* Hover Action Indicator */}
                              <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl opacity-0 scale-95 group-hover:opacity-0 sm:group-hover:opacity-100 sm:group-hover:scale-100 transition-all pointer-events-none" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                
                {(searchQuery || timeFilter !== 'all') && sortedFloors.every(f => 
                   activeApartment.rooms[f].filter(room => {
                      const q = searchQuery.toLowerCase();
                      const matchesSearch = !q || (
                        room.roomNumber.toString().includes(q) ||
                        (room.visitorName && room.visitorName.toLowerCase().includes(q)) ||
                        (room.remark && room.remark.toLowerCase().includes(q))
                      );
                      const matchesTime = checkTimeFilter(room.updatedAt);
                      return matchesSearch && matchesTime;
                   }).length === 0
                ) && (
                  <div className="text-center py-20 animate-in fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      {timeFilter !== 'all' ? <Calendar size={32} /> : <Search size={32} />}
                    </div>
                    <p className="text-slate-500 font-medium">No results found for current filter</p>
                    <button 
                      onClick={() => {setSearchQuery(''); setTimeFilter('all');}} 
                      className="mt-4 text-blue-600 text-sm font-bold hover:underline"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
                
                <div className="h-20 md:h-10"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-slate-50/50">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-white shadow-lg shadow-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 rotate-3 transform hover:rotate-6 transition-transform">
                <Home size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Campaign Selected</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Choose an apartment from the sidebar to view details, or create a new campaign to get started.
              </p>
              
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                Browse Apartments
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeRoom && editingRoom && (
        <RoomModal 
          isOpen={true}
          room={activeRoom}
          onClose={() => setEditingRoom(null)}
          onSave={handleUpdateRoom}
        />
      )}

      {/* Edit Apartment Modal */}
      {editingApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingApartment(null)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Edit Building Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Building Name</label>
                <input 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  value={editingApartment.name}
                  onChange={e => setEditingApartment({...editingApartment, name: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Floors</label>
                   <input 
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    value={editingApartment.floors}
                    onChange={e => setEditingApartment({...editingApartment, floors: Number(e.target.value)})}
                  />
                </div>
                <div className="flex-1">
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Units per Floor</label>
                   <input 
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    value={editingApartment.unitsPerFloor}
                    onChange={e => setEditingApartment({...editingApartment, unitsPerFloor: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800 text-sm">
                 <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                 <p>Reducing floors or units will permanently delete data in the removed rooms.</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setEditingApartment(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleResizeApartment}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;