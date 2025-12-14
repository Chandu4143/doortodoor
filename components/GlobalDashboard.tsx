import { useEffect, useState } from 'react';
import { useAuth, type UserTeam } from '../contexts/AuthContext';
import { getAllTeams, createTeam, getTeamMembers, type Team } from '../services/supabase/teamService';
import { getApartments, getRoomsByApartment } from '../services/supabase/residentialService';
import { getHelpRequests, resolveRequest, subscribeToHelpRequests, type HelpRequest } from '../services/supabase/helpRequestService';
import { claimFloor, getClaimsForApartment, subscribeToClaims, type FloorClaim } from '../services/supabase/floorClaimService'; // We'll need a way to get *all* claims for team
import { Users, Building2, Calendar, Loader2, Plus, TrendingUp, Target, Eye, AlertTriangle, CheckCircle2, Phone, Map, FileText } from 'lucide-react';
import Modal from './ui/Modal';
import VolunteerMap from './VolunteerMap';
import TemplateManager from './TemplateManager';
import CSVImportModal from './CSVImportModal';
import { Apartment } from '../types';

interface TeamStats {
    memberCount: number;
    campaignCount: number;
    totalRaised: number;
    totalVisited: number;
    totalRooms: number;
}

interface GlobalDashboardProps {
    onInspectTeam?: () => void; // Callback when a team is selected for inspection
}

export default function GlobalDashboard({ onInspectTeam }: GlobalDashboardProps) {
    const { profile, setCurrentTeam, refreshTeams } = useAuth();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

    // Map Data
    const [mapApartments, setMapApartments] = useState<Apartment[]>([]);
    const [activeClaims, setActiveClaims] = useState<FloorClaim[]>([]);
    const [showMap, setShowMap] = useState(true);

    // Create Team Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamDescription, setNewTeamDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Template Modal
    const [showPresetsModal, setShowPresetsModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        loadAllTeams();
    }, []);

    // Load stats for all teams after teams are loaded
    useEffect(() => {
        if (allTeams.length > 0) {
            loadAllTeamStats();
            // Default to first team for help requests if available, or just use currentTeam from auth if valid
            // For Global Dashboard, we might want to monitor ALL, but let's monitor the first one for now or loop all.
            // Simplified: If user is inspecting a team, monitor that. If not, maybe just show aggregate counts?
            // Let's Monitor the user's current assigned team or the first one found.
            if (allTeams[0]) {
                setActiveTeamId(allTeams[0].id);
                loadHelpRequests(allTeams[0].id);
            }
        }
    }, [allTeams]);

    // Help Requests Monitoring
    useEffect(() => {
        if (!activeTeamId) return;

        const unsubscribe = subscribeToHelpRequests(activeTeamId, (payload) => {
            if (payload.eventType === 'INSERT') {
                setHelpRequests(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setHelpRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r).filter(r => r.status !== 'resolved'));
            }
        });

        return () => {
            unsubscribe();
        };
    }, [activeTeamId]);


    const loadHelpRequests = async (teamId: string) => {
        const result = await getHelpRequests(teamId);
        if (result.success && result.requests) {
            setHelpRequests(result.requests);
        }
    };

    // Load extra data for map
    const loadMapData = async (teamId: string) => {
        // 1. Get Apartments (for locations)
        const aptRes = await getApartments(teamId);
        if (aptRes.success && aptRes.apartments) {
            // Adapt SupabaseApartment to Apartment (simplified for map)
            const mappedApts: any[] = aptRes.apartments.map(a => ({
                id: a.id,
                name: a.name,
                floors: a.floors,
                unitsPerFloor: a.units_per_floor,
                latitude: a.latitude,
                longitude: a.longitude,
                // other defaults
                rooms: {},
                floorStatus: {}
            }));
            setMapApartments(mappedApts);

            // 2. Get All Active Claims (this endpoint doesn't exist yet properly, we will hack it or add it)
            // For now, let's just fetch claims for the first few apartments to simulate "active" map
            // In a real app, we'd have `getAllTeamClaims(teamId)`
            const allClaimsPromises = aptRes.apartments.map(apt => getClaimsForApartment(apt.id));
            const allClaimsRes = await Promise.all(allClaimsPromises);
            const combinedClaims = allClaimsRes.flatMap(r => r.claims || []);
            setActiveClaims(combinedClaims);
        }
    };

    // Load stats for all teams after teams are loaded
    useEffect(() => {
        if (allTeams.length > 0) {
            loadAllTeamStats();
            if (allTeams[0]) {
                setActiveTeamId(allTeams[0].id);
                loadHelpRequests(allTeams[0].id);
                loadMapData(allTeams[0].id);
            }
        }
    }, [allTeams]);

    const handleResolveRequest = async (id: string) => {
        await resolveRequest(id);
        setHelpRequests(prev => prev.filter(r => r.id !== id));
    };


    const loadAllTeams = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { success, teams, error } = await getAllTeams();
            if (success && teams) {
                setAllTeams(teams);
            } else {
                setError(error || 'Failed to load teams');
            }
        } catch (err) {
            setError('An error occurred while loading teams');
        } finally {
            setIsLoading(false);
        }
    };

    const loadAllTeamStats = async () => {
        setIsLoadingStats(true);
        const stats: Record<string, TeamStats> = {};

        try {
            // Load stats for each team in parallel
            await Promise.all(allTeams.map(async (team) => {
                try {
                    // Get member count
                    const membersResult = await getTeamMembers(team.id);
                    const memberCount = membersResult.success ? (membersResult.members?.length || 0) : 0;

                    // Get apartments and calculate stats
                    const apartmentsResult = await getApartments(team.id);
                    let campaignCount = 0;
                    let totalRaised = 0;
                    let totalVisited = 0;
                    let totalRooms = 0;

                    if (apartmentsResult.success && apartmentsResult.apartments) {
                        campaignCount = apartmentsResult.apartments.length;

                        // Get rooms for each apartment
                        await Promise.all(apartmentsResult.apartments.map(async (apt) => {
                            const roomsResult = await getRoomsByApartment(apt.id);
                            if (roomsResult.success && roomsResult.rooms) {
                                roomsResult.rooms.forEach(room => {
                                    totalRooms++;
                                    if (room.status !== 'unvisited') totalVisited++;
                                    if (room.status === 'donated') totalRaised += (room.amount_donated || 0);
                                });
                            }
                        }));
                    }

                    stats[team.id] = {
                        memberCount,
                        campaignCount,
                        totalRaised,
                        totalVisited,
                        totalRooms
                    };
                } catch (err) {
                    console.error(`Error loading stats for team ${team.id}:`, err);
                    stats[team.id] = { memberCount: 0, campaignCount: 0, totalRaised: 0, totalVisited: 0, totalRooms: 0 };
                }
            }));

            setTeamStats(stats);
        } catch (err) {
            console.error('Error loading team stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setIsCreating(true);
        try {
            const result = await createTeam({
                name: newTeamName.trim(),
                description: newTeamDescription.trim() || undefined
            });
            if (result.success && result.team) {
                setAllTeams(prev => [result.team!, ...prev]);
                setShowCreateModal(false);
                setNewTeamName('');
                setNewTeamDescription('');
                await refreshTeams();
                alert(`Team "${result.team.name}" created successfully!`);
            } else {
                alert('Error: ' + (result.error || 'Failed to create team'));
            }
        } catch (err) {
            alert('Error creating team');
        } finally {
            setIsCreating(false);
        }
    };

    const handleInspectTeam = async (team: Team) => {
        setCurrentTeam({
            ...team,
            team_role: 'leader' // Grant pseudo-leader access for inspection
        } as UserTeam);
        // Navigate back to team-specific view
        onInspectTeam?.();
    };

    if (!['dev', 'owner', 'bdm'].includes(profile?.role || '')) {
        return (
            <div className="p-8 text-center text-slate-500">
                You do not have permission to view the Global Dashboard.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Global Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400">Overview of all campaign activity.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                    <Plus size={18} />
                    New Team
                </button>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setShowPresetsModal(true)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                    <Building2 size={16} />
                    Manage Presets
                </button>

                <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                    <FileText size={16} />
                    Import CSV
                </button>
            </div>

            {/* Active Help Requests Banner */}
            {helpRequests.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-700 dark:text-red-400">Active Help Requests ({helpRequests.length})</h3>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80">Volunteers need assistance immediately.</p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {helpRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col justify-between gap-4">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{req.profiles?.name || 'Unknown Volunteer'}</span>
                                        <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg mb-2">
                                        {req.message}
                                    </p>
                                    {req.profiles?.phone && (
                                        <a href={`tel:${req.profiles.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline mb-1">
                                            <Phone size={12} />
                                            {req.profiles.phone}
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleResolveRequest(req.id)}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <CheckCircle2 size={14} />
                                    Mark Resolved
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Map View */}
            <div className="bg-white dark:bg-slate-804 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Map size={18} className="text-blue-600" />
                        Live Field Activity
                    </h3>
                    <button onClick={() => setShowMap(!showMap)} className="text-xs font-bold text-blue-600 hover:underline">
                        {showMap ? 'Hide Map' : 'Show Map'}
                    </button>
                </div>
                {showMap && (
                    <VolunteerMap
                        apartments={mapApartments}
                        claims={activeClaims}
                        helpRequests={helpRequests}
                    />
                )}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* Aggregate Stats */}
            {!isLoadingStats && Object.keys(teamStats).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <Users size={20} className="text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Members</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">
                                    {Object.values(teamStats).reduce((sum, s) => sum + s.memberCount, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Target size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Campaigns</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">
                                    {Object.values(teamStats).reduce((sum, s) => sum + s.campaignCount, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Raised</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">
                                    ₹{Object.values(teamStats).reduce((sum, s) => sum + s.totalRaised, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <Building2 size={20} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Doors Visited</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">
                                    {Object.values(teamStats).reduce((sum, s) => sum + s.totalVisited, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTeams.map(team => {
                    const stats = teamStats[team.id];
                    const progress = stats && stats.totalRooms > 0
                        ? Math.round((stats.totalVisited / stats.totalRooms) * 100)
                        : 0;

                    return (
                        <div
                            key={team.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Building2 size={24} />
                                </div>
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">
                                    {team.team_code}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                {team.name}
                            </h3>

                            {team.description && (
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                                    {team.description}
                                </p>
                            )}

                            {/* Team Stats */}
                            {stats ? (
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.memberCount}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Members</p>
                                    </div>
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.campaignCount}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Campaigns</p>
                                    </div>
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{(stats.totalRaised / 1000).toFixed(1)}k</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Raised</p>
                                    </div>
                                </div>
                            ) : isLoadingStats ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                </div>
                            ) : null}

                            {/* Progress Bar */}
                            {stats && stats.totalRooms > 0 && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        <span>Progress</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                <Calendar size={12} />
                                Created {new Date(team.created_at).toLocaleDateString()}
                            </div>

                            <button
                                onClick={() => handleInspectTeam(team)}
                                className="w-full py-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Eye size={16} />
                                View Team
                            </button>
                        </div>
                    );
                })}
            </div>

            {allTeams.length === 0 && !isLoading && !error && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No Teams Found</h3>
                    <p className="text-slate-400 mb-4">Create a team to get started.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Create First Team
                    </button>
                </div>
            )}

            {/* Create Team Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Team">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Team Name</label>
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Alpha Squad"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                        <textarea
                            value={newTeamDescription}
                            onChange={e => setNewTeamDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="Briefly describe the team's mission..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateTeam}
                            disabled={isCreating || !newTeamName.trim()}
                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'Create Team'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Template Manager Modal */}
            <Modal isOpen={showPresetsModal} onClose={() => setShowPresetsModal(false)} title="Manage Templates" className="max-w-4xl">
                {activeTeamId && <TemplateManager teamId={activeTeamId} onClose={() => setShowPresetsModal(false)} />}
                {!activeTeamId && <p className="text-center text-red-500">Please select or create a team first.</p>}
            </Modal>

            {/* CSV Import Modal */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Campaigns">
                {activeTeamId && <CSVImportModal teamId={activeTeamId} onClose={() => setShowImportModal(false)} onSuccess={() => {
                    loadAllTeamStats();
                    if (activeTeamId) loadMapData(activeTeamId);
                }} />}
                {!activeTeamId && <p className="text-center text-red-500">Please select or create a team first.</p>}
            </Modal>
        </div>
    );
}
