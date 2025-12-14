/**
 * CorporateTeamPanel Component
 * Displays team members and team management options using Supabase
 * Mirrors the residential TeamPanel functionality for corporate mode
 * Requirements: 20.1, 20.2
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, QrCode, Share2, RefreshCw,
  User, Check, LogOut, Settings, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getTeamMembers, 
  type TeamMember,
  type Team
} from '../../services/supabase/teamService';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';
import TeamCodeShare from '../team/TeamCodeShare';
import TeamMemberList from '../team/TeamMemberList';
import TeamSwitcher from '../team/TeamSwitcher';

interface CorporateTeamPanelProps {
  onCreateTeam?: () => void;
}

export default function CorporateTeamPanel({ onCreateTeam }: CorporateTeamPanelProps) {
  const { user, profile, currentTeam, teams, refreshTeams } = useAuth();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSwitcherModal, setShowSwitcherModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load team members when current team changes
  const loadMembers = useCallback(async () => {
    if (!currentTeam) {
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTeamMembers(currentTeam.id);
      if (result.success && result.members) {
        setMembers(result.members);
      } else {
        setError(result.error || 'Failed to load team members');
      }
    } catch (err) {
      setError('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadMembers(), refreshTeams()]);
    setIsRefreshing(false);
  };

  // Check if current user can manage team (Team Leader+ or admin roles)
  const canManageTeam = profile && (
    ['dev', 'owner', 'bdm'].includes(profile.role) ||
    currentTeam?.team_role === 'leader'
  );

  // Check if current user can share team code
  const canShareTeamCode = profile && (
    ['dev', 'owner', 'bdm', 'team_leader'].includes(profile.role) ||
    currentTeam?.team_role === 'leader'
  );

  // Find current user in members list
  const currentMember = members.find(m => m.user_id === user?.id);

  if (!currentTeam) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users size={20} className="text-purple-500" />
            Team
          </h2>
        </div>
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <Users size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No team selected</p>
          {teams.length > 0 ? (
            <button
              onClick={() => setShowSwitcherModal(true)}
              className="mt-2 text-purple-600 dark:text-purple-400 text-sm font-bold"
            >
              Select a Team
            </button>
          ) : (
            <button
              onClick={onCreateTeam}
              className="mt-2 text-purple-600 dark:text-purple-400 text-sm font-bold"
            >
              + Join or Create Team
            </button>
          )}
        </div>
        
        {/* Team Switcher Modal */}
        <TeamSwitcher
          isOpen={showSwitcherModal}
          onClose={() => setShowSwitcherModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users size={20} className="text-purple-500" />
          Team
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
              isRefreshing && "animate-spin"
            )}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          {canShareTeamCode && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              title="Share Team Code"
            >
              <QrCode size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Current Team Banner */}
      <button
        onClick={() => setShowSwitcherModal(true)}
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-xl text-white text-left hover:from-purple-600 hover:to-indigo-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 mb-1">Current Team</p>
            <p className="text-lg font-bold">{currentTeam.name}</p>
            {currentTeam.description && (
              <p className="text-sm opacity-90 mt-1">{currentTeam.description}</p>
            )}
          </div>
          <ChevronDown size={20} className="opacity-75" />
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
          <span>{members.length} members</span>
          {currentMember && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {currentMember.team_role === 'leader' ? 'Team Leader' : 'Member'}
            </span>
          )}
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Team Members List */}
      <TeamMemberList
        members={members}
        currentUserId={user?.id || ''}
        teamId={currentTeam.id}
        canManage={canManageTeam || false}
        isLoading={isLoading}
        onMemberUpdated={loadMembers}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        {canShareTeamCode && (
          <button
            onClick={() => setShowShareModal(true)}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <Share2 size={16} />
            Share Code
          </button>
        )}
        {teams.length > 1 && (
          <button
            onClick={() => setShowSwitcherModal(true)}
            className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <Settings size={16} />
            Switch Team
          </button>
        )}
      </div>

      {/* Share Team Code Modal */}
      <TeamCodeShare
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        team={currentTeam}
      />

      {/* Team Switcher Modal */}
      <TeamSwitcher
        isOpen={showSwitcherModal}
        onClose={() => setShowSwitcherModal(false)}
      />
    </div>
  );
}
