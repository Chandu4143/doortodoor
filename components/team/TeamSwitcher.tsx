/**
 * TeamSwitcher Component
 * Allows users to switch between multiple teams they belong to
 * Requirements: 3.5, 20.5
 */

import React, { useState } from 'react';
import { 
  Users, Check, Plus, LogOut, ChevronRight,
  Shield, User, Crown
} from 'lucide-react';
import { useAuth, type UserTeam } from '../../contexts/AuthContext';
import { leaveTeam, type TeamRole } from '../../services/supabase/teamService';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';

interface TeamSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinTeam?: () => void;
  onCreateTeam?: () => void;
}

// Team role display configuration
const TEAM_ROLE_CONFIG: Record<TeamRole, { label: string; icon: React.ReactNode; color: string }> = {
  leader: { 
    label: 'Leader', 
    icon: <Shield size={12} />,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
  },
  member: { 
    label: 'Member', 
    icon: <User size={12} />,
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400' 
  },
};

export default function TeamSwitcher({ 
  isOpen, 
  onClose, 
  onJoinTeam,
  onCreateTeam 
}: TeamSwitcherProps) {
  const { teams, currentTeam, setCurrentTeam, profile, refreshTeams } = useAuth();
  
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle team selection
  const handleSelectTeam = (team: UserTeam) => {
    setCurrentTeam(team);
    onClose();
  };

  // Handle leaving a team
  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to leave "${teamName}"? You will need the team code to rejoin.`)) {
      return;
    }

    setIsLeaving(teamId);
    setError(null);

    try {
      const result = await leaveTeam(teamId);
      if (result.success) {
        await refreshTeams();
        // If we left the current team, clear selection
        if (currentTeam?.id === teamId) {
          setCurrentTeam(null);
        }
      } else {
        setError(result.error || 'Failed to leave team');
      }
    } catch (err) {
      setError('Failed to leave team');
    } finally {
      setIsLeaving(null);
    }
  };

  // Check if user can create teams (Owner or BDM)
  const canCreateTeam = profile && ['dev', 'owner', 'bdm'].includes(profile.role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Team">
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-4">You're not a member of any team yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase font-bold px-1">
              Your Teams ({teams.length})
            </p>
            
            {teams.map(team => {
              const isSelected = currentTeam?.id === team.id;
              const isLeavingThis = isLeaving === team.id;
              const roleConfig = TEAM_ROLE_CONFIG[team.team_role];

              return (
                <div
                  key={team.id}
                  className={cn(
                    "rounded-xl border-2 transition-all overflow-hidden",
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800"
                  )}
                >
                  <button
                    onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 text-left"
                    disabled={isLeavingThis}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {team.name}
                          </p>
                          {isSelected && (
                            <Check size={16} className="text-purple-500 flex-shrink-0" />
                          )}
                        </div>
                        {team.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                            {team.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                            roleConfig.color
                          )}>
                            {roleConfig.icon}
                            {roleConfig.label}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </button>

                  {/* Leave Team Option */}
                  {teams.length > 1 && (
                    <div className="px-4 pb-3 pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveTeam(team.id, team.name);
                        }}
                        disabled={isLeavingThis}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                      >
                        {isLeavingThis ? (
                          <>
                            <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                            Leaving...
                          </>
                        ) : (
                          <>
                            <LogOut size={12} />
                            Leave Team
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          {/* Join Team */}
          <button
            onClick={() => {
              onClose();
              onJoinTeam?.();
            }}
            className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Join Team with Code
          </button>

          {/* Create Team (for authorized users) */}
          {canCreateTeam && (
            <button
              onClick={() => {
                onClose();
                onCreateTeam?.();
              }}
              className="w-full py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Create New Team
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-slate-400 text-center">
          {teams.length > 0 
            ? 'Select a team to switch to it, or join/create a new team.'
            : 'Enter a team code to join an existing team.'}
        </p>
      </div>
    </Modal>
  );
}
