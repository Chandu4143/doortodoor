import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTeams, type Team } from '../services/supabase/teamService';
import { Users, Building2, Calendar, ArrowRight, Loader2 } from 'lucide-react';

export default function GlobalDashboard() {
    const { profile, setCurrentTeam, refreshTeams } = useAuth();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAllTeams();
    }, []);

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

    const handleInspectTeam = async (team: Team) => {
        // For now, we simple set the current team. 
        // Note: The AuthContext usually only keeps "UserTeams" (teams user is member of).
        // If we want to inspect a team we aren't part of, we might need to handle that in AuthContext 
        // or just trick the UI by passing a constructed object if the context allows.

        // However, standard flow implies we might want to Join it or simply View it.
        // Let's assume for this "Global View" we just want to see stats. 
        // But the user asked to "view all teams and their data".
        // The easiest way on the frontend to view data is to "become" that team in the context.

        // Ideally, we should join the team silently or have a "Spectator" mode.
        // For simplicity in Phase 4, let's auto-join or mock membership if possible, 
        // but 'setCurrentTeam' expects a UserTeam (with role).

        // Workaround: We will pass it as a UserTeam with a 'spectator' or 'owner' role 
        // temporarily for the session since we are Dev/Owner.

        setCurrentTeam({
            ...team,
            team_role: 'leader' // Grant pseudo-leader access for inspection
        });

        // Navigate or let the user know context has changed
        alert(`Switched context to team: ${team.name}`);
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
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Global Overview</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Managing {allTeams.length} teams across the organization.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTeams.map(team => (
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
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                                {team.description}
                            </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                            <Calendar size={12} />
                            Created {new Date(team.created_at).toLocaleDateString()}
                        </div>

                        <button
                            onClick={() => handleInspectTeam(team)}
                            className="w-full py-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            Inspect Team <ArrowRight size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {allTeams.length === 0 && !isLoading && !error && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No Teams Found</h3>
                    <p className="text-slate-400">Create a team to get started.</p>
                </div>
            )}
        </div>
    );
}
