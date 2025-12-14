import React, { useMemo } from 'react';
import {
    Building2,
    Settings,
    Search,
    X,
    Calendar,
    Clock,
    Target,
    AlertTriangle
} from 'lucide-react';
import { Apartment, Room, RoomStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import SwipeableRoomCard from './SwipeableRoomCard';
import FloorProgress from './FloorProgress';
import {
    getOptimalStartFloor,
    getSkipSuggestions,
    type FloorSuggestion
} from '../services/supabase/routePlanningService';
import {
    claimFloor,
    releaseFloor,
    getClaimsForApartment as getFloorClaims,
    subscribeToClaims as subscribeToFloorClaims,
    type FloorClaim
} from '../services/supabase/floorClaimService';
import { supabase } from '../services/supabase/client';
import HelpRequestModal from './HelpRequestModal';
import { useAuth } from '../contexts/AuthContext';
import { useShake } from '../hooks/useShake';
import UndoToast from './UndoToast';

interface ApartmentViewProps {
    apartment: Apartment;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    timeFilter: 'all' | 'today' | 'yesterday';
    setTimeFilter: (t: 'all' | 'today' | 'yesterday') => void;
    selectedFloor: string | null;
    setSelectedFloor: (f: string | null) => void;
    onEditApartment: () => void;
    onRoomClick: (roomId: string, floor: string, apartmentId: string) => void;
    onQuickStatusChange?: (roomId: string, floor: string, status: RoomStatus) => void;
    onDonation?: () => void; // Callback for donation celebration
}

export default function ApartmentView({
    apartment,
    searchQuery,
    setSearchQuery,
    timeFilter,
    setTimeFilter,
    selectedFloor,
    setSelectedFloor,
    onEditApartment,
    onRoomClick,
    onQuickStatusChange,
    onDonation
}: ApartmentViewProps) {

    // Wrap quick status change to track history
    const handleQuickStatusChange = (roomId: string, floor: string, status: RoomStatus) => {
        // Find previous status (needed for undo) - this requires looking up the room
        // Since we don't have direct access to "previous" without strict state tracking, 
        // we might only support undoing if we know the previous state. 
        // For now, let's assume 'unvisited' as default rollback or try to find it.
        // Better approach: Pass previous status from the UI component calling this or look it up in `apartment`.

        // Lookup current status before change
        const currentRoom = apartment.rooms[floor]?.find(r => r.id === roomId);
        if (currentRoom) {
            setLastAction({
                roomId,
                floor,
                previousStatus: currentRoom.status
            });
        }

        if (onQuickStatusChange) {
            onQuickStatusChange(roomId, floor, status);
            // Trigger confetti for donations
            if (status === 'donated' && onDonation) {
                onDonation();
            }
        }
    };

    // --- Volunteer Engagement State ---
    const [routeSuggestion, setRouteSuggestion] = React.useState<FloorSuggestion | null>(null);
    const [skipFloors, setSkipFloors] = React.useState<number[]>([]);
    const [floorClaims, setFloorClaims] = React.useState<FloorClaim[]>([]);
    const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);
    const [showHelpModal, setShowHelpModal] = React.useState(false);
    const { currentTeam } = useAuth();

    // --- Shake to Undo State ---
    const [showUndoToast, setShowUndoToast] = React.useState(false);
    const [lastAction, setLastAction] = React.useState<{ roomId: string, floor: string, previousStatus: RoomStatus } | null>(null);

    // Handle Shake
    useShake(() => {
        if (lastAction) {
            setShowUndoToast(true);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    });

    const handleUndo = () => {
        if (lastAction && onQuickStatusChange) {
            onQuickStatusChange(lastAction.roomId, lastAction.floor, lastAction.previousStatus);
            setShowUndoToast(false);
            setLastAction(null);
            // alert('Undone!'); // Optional feedback
        }
    };


    // Fetch user ID
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    // Load Route Suggestions & Claims
    React.useEffect(() => {
        if (!apartment.id) return;

        const loadData = async () => {
            setIsLoadingRoute(true);
            try {
                // Parallel fetch
                const [startFloorRes, skipsRes, claimsRes] = await Promise.all([
                    getOptimalStartFloor(apartment.id),
                    getSkipSuggestions(apartment.id),
                    getFloorClaims(apartment.id)
                ]);

                if (startFloorRes.success && startFloorRes.suggestion) {
                    setRouteSuggestion(startFloorRes.suggestion);
                }
                if (skipsRes.success && skipsRes.suggestions) {
                    setSkipFloors(skipsRes.suggestions.map(s => s.floor));
                }
                if (claimsRes.success && claimsRes.claims) {
                    setFloorClaims(claimsRes.claims);
                }
            } catch (e) {
                console.error("Failed to load engagement data", e);
            } finally {
                setIsLoadingRoute(false);
            }
        };

        loadData();

        // Subscribe to claims
        const unsubscribe = subscribeToFloorClaims(apartment.id, (payload) => {
            // Refresh claims on any change for simplicity
            getFloorClaims(apartment.id).then(res => {
                if (res.success && res.claims) setFloorClaims(res.claims);
            });
        });

        return () => {
            unsubscribe();
        };
    }, [apartment.id]);

    const handleClaimFloor = async (floor: number) => {
        if (!currentUserId) return;

        // Optimistic update
        const tempClaim: FloorClaim = {
            id: 'temp',
            apartment_id: apartment.id,
            floor,
            user_id: currentUserId,
            claimed_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString()
        };
        setFloorClaims(prev => [...prev, tempClaim]);

        try {
            await claimFloor({ apartmentId: apartment.id, floor });
            // Real refresh happens via subscription
        } catch (e) {
            console.error(e);
            // Revert on error
            setFloorClaims(prev => prev.filter(c => c.id !== 'temp'));
            alert("Failed to claim floor. It might be taken.");
        }
    };

    const handleReleaseFloor = async (floor: number) => {
        const claim = floorClaims.find(c => c.floor === floor && c.user_id === currentUserId);
        if (!claim) return;

        // Optimistic
        setFloorClaims(prev => prev.filter(c => c.floor !== floor));

        try {
            await releaseFloor({ apartmentId: apartment.id, floor });
        } catch (e) {
            console.error(e);
            getFloorClaims(apartment.id).then(res => {
                if (res.success && res.claims) setFloorClaims(res.claims);
            }); // Revert
        }
    };

    // --- Derived Data ---
    const sortedFloors = useMemo(() => {
        return Object.keys(apartment.rooms).sort((a, b) => Number(b) - Number(a));
    }, [apartment]);

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

    // --- Render Helpers ---
    const isFiltered = searchQuery || timeFilter !== 'all';

    return (
        <div className="h-full flex flex-col">

            {/* Desktop Apartment Header */}
            <div className="hidden md:flex bg-white dark:bg-slate-900 px-8 py-5 items-center justify-between shrink-0 border-b border-slate-200/60 dark:border-slate-800 shadow-sm z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{apartment.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {apartment.floors} Floors • {Object.values(apartment.rooms).flat().length} Units Total
                        </p>
                    </div>
                    <button
                        onClick={onEditApartment}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-2"
                        title="Edit Apartment Structure"
                    >
                        <Settings size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-4">

                    {/* Time Filter */}
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        {(['all', 'today', 'yesterday'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                                    timeFilter === filter
                                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                )}
                            >
                                {filter === 'all' ? 'All' : filter}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    {/* Desktop Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Find unit..."
                            className="w-48 focus:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300 dark:focus:border-blue-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400"
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
            <div className="md:hidden bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex overflow-x-auto gap-3 no-scrollbar shrink-0 shadow-sm z-10">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const count = (Object.values(apartment.rooms).flat() as Room[]).filter(r => r.status === key).length;
                    const Icon = config.icon;
                    return (
                        <div key={key} className={cn(
                            "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 shadow-sm",
                            config.color.replace('text', 'border-') // This is a bit hacky but keeps existing logic
                        )}>
                            <Icon size={14} strokeWidth={3} className={config.color} />
                            <span className="dark:text-slate-300">{config.label}</span> <span className="opacity-60 dark:text-slate-500">({count})</span>
                        </div>
                    )
                })}
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Engagement Banner: Route Suggestion */}
                {routeSuggestion && !isFiltered && (
                    <div className="md:hidden bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Target size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                Suggested Start: Floor {routeSuggestion.floor}
                            </p>
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                                {routeSuggestion.reason}
                            </p>
                            {selectedFloor !== String(routeSuggestion.floor) && (
                                <button
                                    onClick={() => setSelectedFloor(String(routeSuggestion.floor))}
                                    className="mt-2 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
                                >
                                    Go to Floor {routeSuggestion.floor}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Responsive Floor Selector (Hidden if searching) */}
                {/* Floor Selector with scroll indicators */}
                <div className={cn(
                    isFiltered ? 'hidden' : 'flex',
                    "relative w-full md:w-20 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-slate-800",
                    "flex-row md:flex-col items-center shrink-0 z-10 transition-all"
                )}>
                    {/* Scroll fade indicators for mobile */}
                    <div className="md:hidden absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />
                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />

                    <div className="flex md:flex-col items-center overflow-x-auto md:overflow-y-auto gap-2 p-2 md:py-6 no-scrollbar w-full">
                        <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Floor</span>

                        <button
                            className={cn(
                                "w-auto md:w-12 h-9 md:h-12 px-4 md:px-0 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shrink-0",
                                selectedFloor === null
                                    ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-200 dark:shadow-slate-800 scale-100"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            )}
                            onClick={() => setSelectedFloor(null)}
                        >
                            All
                        </button>
                        <div className="hidden md:block w-8 h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                        <div className="md:hidden h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>


                        {sortedFloors.map(floor => (
                            <button
                                key={floor}
                                onClick={() => setSelectedFloor(floor)}
                                className={cn(
                                    "w-10 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-sm font-bold transition-all shrink-0",
                                    selectedFloor === floor
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/50 scale-105"
                                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 md:border-transparent"
                                )}
                            >
                                {floor}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Room Grid */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-50/30 dark:bg-slate-950/30 custom-scrollbar">
                    {sortedFloors.map(floor => {
                        // Filter rooms based on search query and Time Filter
                        const floorRooms = apartment.rooms[floor];
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
                        if (isFiltered && filteredRooms.length === 0) return null;

                        // If not filtering, check floor selection
                        if (!isFiltered && selectedFloor !== null && selectedFloor !== floor) return null;

                        return (
                            <div key={floor} className="mb-8 animate-in slide-in-from-bottom duration-500">
                                {/* Floor Progress Bar */}
                                <div className="mb-4">
                                    <FloorProgress
                                        floor={floor}
                                        rooms={floorRooms}
                                        onNextUnvisited={(roomId) => onRoomClick(roomId, floor, apartment.id)}
                                    />
                                </div>

                                {/* Floor Claiming UI */}
                                <div className="mb-4 px-1 flex items-center justify-between">
                                    {(() => {
                                        const floorNum = Number(floor);
                                        const claim = floorClaims.find(c => c.floor === floorNum);
                                        const isMyClaim = claim?.user_id === currentUserId;
                                        const isSkipped = skipFloors.includes(floorNum);

                                        if (claim) {
                                            return (
                                                <div className={cn(
                                                    "text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border",
                                                    isMyClaim
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                                        : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                                                )}>
                                                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isMyClaim ? "bg-emerald-500" : "bg-amber-500")} />
                                                    {isMyClaim ? "You are working on this floor" : "Another volunteer is here"}
                                                    {isMyClaim && (
                                                        <button
                                                            onClick={() => handleReleaseFloor(floorNum)}
                                                            className="ml-2 underline hover:no-underline opacity-80"
                                                        >
                                                            Done
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleClaimFloor(floorNum)}
                                                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-full transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400"
                                                >
                                                    Claim Floor
                                                </button>
                                                {isSkipped && (
                                                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                                                        High Skip Rate
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="flex items-center gap-4 mb-4 sticky top-0 md:relative z-10 py-2 md:py-0 pl-1 md:pl-0">
                                    {/* Glassmorphic Floor Header for Mobile */}
                                    <div className="md:hidden absolute inset-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md -mx-3 -my-2 border-b border-slate-200/50 dark:border-slate-800/50"></div>
                                    <h3 className="relative text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        Floor {floor}
                                    </h3>
                                    <div className="relative h-px bg-slate-200/60 dark:bg-slate-800 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 relative z-0">
                                    {filteredRooms.map(room => {
                                        const status = STATUS_CONFIG[room.status];
                                        const Icon = status.icon;
                                        const visitTime = formatVisitTime(room.updatedAt);

                                        // Mobile: Use swipeable card
                                        if (onQuickStatusChange && typeof window !== 'undefined' && window.innerWidth < 640) {
                                            return (
                                                <React.Fragment key={room.id}>
                                                    <SwipeableRoomCard
                                                        room={room}
                                                        onStatusChange={(newStatus) => handleQuickStatusChange(room.id, floor, newStatus)}
                                                        onClick={() => onRoomClick(room.id, floor, apartment.id)}
                                                    />
                                                </React.Fragment>
                                            );
                                        }

                                        // Desktop: Regular card
                                        return (
                                            <div
                                                key={room.id}
                                                onClick={() => onRoomClick(room.id, floor, apartment.id)}
                                                className={cn(
                                                    "group relative bg-white dark:bg-slate-800 border rounded-2xl p-4 cursor-pointer transition-all duration-200",
                                                    "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 active:scale-95 active:shadow-none",
                                                    "flex flex-col justify-between min-h-[140px]",
                                                    room.status === 'unvisited' ? 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500' : '',
                                                    room.status === 'donated' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-900/10' : '',
                                                    room.status === 'callback' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/10 dark:bg-amber-900/10' : '',
                                                    room.status === 'not_interested' ? 'border-red-100 dark:border-red-900/50 bg-red-50/10 dark:bg-red-900/10' : '',
                                                    room.status === 'other' ? 'border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800' : ''
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">#{room.roomNumber}</span>
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl shadow-sm transition-transform group-hover:scale-110",
                                                        status.bg,
                                                        status.color.replace('text-', 'text-opacity-100 text-'),
                                                        "dark:text-opacity-100"
                                                    )}>
                                                        <Icon size={20} strokeWidth={2.5} />
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    {room.visitorName ? (
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate mb-1">{room.visitorName}</p>
                                                    ) : (
                                                        <p className="text-xs text-slate-300 dark:text-slate-600 font-medium italic mb-1">Unknown Visitor</p>
                                                    )}

                                                    {room.status === 'donated' && room.amountDonated ? (
                                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                            <span className="text-[10px]">₹</span>{room.amountDonated}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium min-h-[1.5em]">
                                                            {room.remark}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Footer: Timestamp */}
                                                {visitTime && (
                                                    <div className={cn(
                                                        "mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-700/50 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide",
                                                        room.status === 'unvisited' ? 'opacity-0' : 'opacity-60 dark:text-slate-400'
                                                    )}>
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

                    {isFiltered && sortedFloors.every(f =>
                        apartment.rooms[f].filter(room => {
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
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                                    {timeFilter !== 'all' ? <Calendar size={32} /> : <Search size={32} />}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No results found for current filter</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setTimeFilter('all'); }}
                                    className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}

                    <div className="h-20 md:h-10"></div>
                </div>
            </div>
            {/* Undo Toast */}
            <UndoToast
                isVisible={showUndoToast}
                onUndo={handleUndo}
                onDismiss={() => setShowUndoToast(false)}
            />

            {/* Help Request Modal */}
            {currentTeam && (
                <HelpRequestModal
                    isOpen={showHelpModal}
                    onClose={() => setShowHelpModal(false)}
                    teamId={currentTeam.id}
                    buildingName={apartment.name}
                />
            )}

            {/* Quick Actions FAB */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
                <button
                    onClick={() => setShowHelpModal(true)}
                    className="p-4 bg-red-600 text-white rounded-full shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:bg-red-700 transition-transform hover:scale-105 active:scale-95"
                    title="Request Help"
                >
                    <AlertTriangle className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
