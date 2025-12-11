/**
 * TeamMemberList Component
 * Displays team members with their names and roles
 * Shows management options for Team Leader+ users
 * Requirements: 20.1, 20.4
 */

import React, { useState } from 'react';
import { 
  User, Shield, Crown, Trash2, ChevronDown, 
  Check, X, MoreVertical, UserMinus
} from 'lucide-react';
import { 
  type TeamMember, 
  type TeamRole,
  removeMember,
  updateMemberRole
} from '../../services/supabase/teamService';
import { cn } from '../../utils/cn';

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserId: string;
  teamId: string;
  canManage: boolean;
  isLoading: boolean;
  onMemberUpdated: () => void;
}

// Role display configuration
const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  dev: { 
    label: 'Developer', 
    icon: <Crown size={12} />, 
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' 
  },
  owner: { 
    label: 'Owner', 
    icon: <Crown size={12} />, 
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' 
  },
  bdm: { 
    label: 'BDM', 
    icon: <Shield size={12} />, 
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  team_leader: { 
    label: 'Team Leader', 
    icon: <Shield size={12} />, 
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
  },
  team_member: { 
    label: 'Member', 
    icon: <User size={12} />, 
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400' 
  },
};

// Team role display
const TEAM_ROLE_CONFIG: Record<TeamRole, { label: string; color: string }> = {
  leader: { 
    label: 'Leader', 
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
  },
  member: { 
    label: 'Member', 
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400' 
  },
};

export default function TeamMemberList({
  members,
  currentUserId,
  teamId,
  canManage,
  isLoading,
  onMemberUpdated,
}: TeamMemberListProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sort members: leaders first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.team_role === 'leader' && b.team_role !== 'leader') return -1;
    if (a.team_role !== 'leader' && b.team_role === 'leader') return 1;
    return a.profile.name.localeCompare(b.profile.name);
  });

  // Handle removing a member
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;

    setActionLoading(userId);
    setError(null);

    try {
      const result = await removeMember(teamId, userId);
      if (result.success) {
        onMemberUpdated();
      } else {
        setError(result.error || 'Failed to remove member');
      }
    } catch (err) {
      setError('Failed to remove member');
    } finally {
      setActionLoading(null);
      setExpandedMember(null);
    }
  };

  // Handle changing member's team role
  const handleChangeRole = async (userId: string, newRole: TeamRole) => {
    setActionLoading(userId);
    setError(null);

    try {
      const result = await updateMemberRole(teamId, userId, newRole);
      if (result.success) {
        onMemberUpdated();
      } else {
        setError(result.error || 'Failed to update role');
      }
    } catch (err) {
      setError('Failed to update role');
    } finally {
      setActionLoading(null);
      setExpandedMember(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div 
            key={i}
            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500">
        <User size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Member Count */}
      <p className="text-xs text-slate-400 uppercase font-bold px-1">
        {members.length} {members.length === 1 ? 'Member' : 'Members'}
      </p>

      {/* Members List */}
      {sortedMembers.map(member => {
        const isCurrentUser = member.user_id === currentUserId;
        const isExpanded = expandedMember === member.id;
        const isActionLoading = actionLoading === member.user_id;
        const roleConfig = ROLE_CONFIG[member.profile.role] || ROLE_CONFIG.team_member;
        const teamRoleConfig = TEAM_ROLE_CONFIG[member.team_role];

        return (
          <div
            key={member.id}
            className={cn(
              "rounded-xl border-2 transition-all overflow-hidden",
              isCurrentUser
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
            )}
          >
            {/* Member Row */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                  member.team_role === 'leader' ? "bg-green-500" : "bg-slate-400"
                )}>
                  {member.profile.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {member.profile.name}
                      {isCurrentUser && (
                        <span className="text-xs text-slate-400 ml-1">(You)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Team Role Badge */}
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                      teamRoleConfig.color
                    )}>
                      {teamRoleConfig.label}
                    </span>
                    {/* Global Role Badge (if admin) */}
                    {['dev', 'owner', 'bdm'].includes(member.profile.role) && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                        roleConfig.color
                      )}>
                        {roleConfig.icon}
                        {roleConfig.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isCurrentUser && (
                  <Check size={16} className="text-purple-500" />
                )}
                {canManage && !isCurrentUser && (
                  <button
                    onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <MoreVertical size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && canManage && !isCurrentUser && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {/* Change Role */}
                  {member.team_role === 'member' ? (
                    <button
                      onClick={() => handleChangeRole(member.user_id, 'leader')}
                      disabled={isActionLoading}
                      className="flex-1 py-2 px-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2"
                    >
                      <Shield size={14} />
                      Make Leader
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangeRole(member.user_id, 'member')}
                      disabled={isActionLoading}
                      className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <User size={14} />
                      Make Member
                    </button>
                  )}

                  {/* Remove Member */}
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.profile.name)}
                    disabled={isActionLoading}
                    className="py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserMinus size={14} />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
