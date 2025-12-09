/**
 * Role Permission Utilities
 * 
 * Implements the role permission hierarchy for the Door-to-Door application.
 * Requirements: 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3
 */

import type { UserRole } from '../services/supabase/profileService';

/**
 * Role hierarchy levels (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  dev: 5,
  owner: 4,
  bdm: 3,
  team_leader: 2,
  team_member: 1,
};

/**
 * Permission matrix defining which roles can assign which other roles.
 * 
 * - Dev: Can assign any role including Owner (max 3 owners)
 * - Owner: Can assign BDM, Team Leader, Team Member (not Owner)
 * - BDM: Can assign Team Leader, Team Member (not Owner, BDM)
 * - Team Leader: Can assign Team Member only within their team
 * - Team Member: Cannot assign any roles
 * 
 * Requirements: 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3
 */
const ASSIGNABLE_ROLES: Record<UserRole, UserRole[]> = {
  dev: ['owner', 'bdm', 'team_leader', 'team_member'],
  owner: ['bdm', 'team_leader', 'team_member'],
  bdm: ['team_leader', 'team_member'],
  team_leader: ['team_member'],
  team_member: [],
};

/**
 * Checks if a user with the given role can assign a target role to another user.
 * 
 * @param assignerRole - The role of the user attempting to assign
 * @param targetRole - The role being assigned
 * @returns true if the assignment is allowed, false otherwise
 * 
 * Requirements: 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3
 */
export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  const assignableRoles = ASSIGNABLE_ROLES[assignerRole];
  return assignableRoles.includes(targetRole);
}

/**
 * Gets the list of roles that a user with the given role can assign.
 * 
 * @param assignerRole - The role of the user
 * @returns Array of roles that can be assigned
 * 
 * Requirements: 4.1, 5.3, 6.2, 7.2
 */
export function getAssignableRoles(assignerRole: UserRole): UserRole[] {
  return [...ASSIGNABLE_ROLES[assignerRole]];
}

/**
 * Gets the hierarchy level of a role.
 * Higher numbers indicate more permissions.
 * 
 * @param role - The role to check
 * @returns The hierarchy level (1-5)
 */
export function getRoleHierarchyLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role];
}

/**
 * Checks if a role has higher or equal permissions than another role.
 * 
 * @param role - The role to check
 * @param comparedTo - The role to compare against
 * @returns true if role has >= permissions than comparedTo
 */
export function hasHigherOrEqualRole(role: UserRole, comparedTo: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[comparedTo];
}

/**
 * Checks if a user can manage (view/edit) another user based on roles.
 * 
 * @param managerRole - The role of the managing user
 * @param targetRole - The role of the target user
 * @returns true if the manager can manage the target
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // Dev can manage everyone
  if (managerRole === 'dev') return true;
  
  // Owner can manage everyone except dev
  if (managerRole === 'owner') return targetRole !== 'dev';
  
  // BDM can manage team_leader and team_member
  if (managerRole === 'bdm') {
    return targetRole === 'team_leader' || targetRole === 'team_member';
  }
  
  // Team Leader can only manage team_member
  if (managerRole === 'team_leader') return targetRole === 'team_member';
  
  // Team Member cannot manage anyone
  return false;
}

/**
 * Checks if a role is an admin role (dev, owner, or bdm).
 * Admin roles have cross-team visibility.
 * 
 * @param role - The role to check
 * @returns true if the role is an admin role
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'dev' || role === 'owner' || role === 'bdm';
}

/**
 * Checks if a role can create teams.
 * Only Owner and BDM can create teams.
 * 
 * Requirements: 2.1, 6.1
 */
export function canCreateTeam(role: UserRole): boolean {
  return role === 'dev' || role === 'owner' || role === 'bdm';
}

/**
 * Checks if a role can view the team code for sharing.
 * Owner, BDM, and Team Leader can view/share team codes.
 * 
 * Requirements: 21.1
 */
export function canViewTeamCode(role: UserRole): boolean {
  return role === 'dev' || role === 'owner' || role === 'bdm' || role === 'team_leader';
}

/**
 * Checks if a role can remove members from a team.
 * Team Leader and above can remove members.
 * 
 * Requirements: 7.4
 */
export function canRemoveTeamMember(role: UserRole): boolean {
  return role === 'dev' || role === 'owner' || role === 'bdm' || role === 'team_leader';
}

/**
 * Checks if a role can view all teams' data.
 * Only Owner and BDM have cross-team visibility.
 * 
 * Requirements: 5.1, 6.4
 */
export function canViewAllTeams(role: UserRole): boolean {
  return role === 'dev' || role === 'owner' || role === 'bdm';
}

/**
 * Maximum number of owners allowed in the system.
 * Requirements: 4.3, 5.6
 */
export const MAX_OWNERS = 3;

/**
 * All available user roles in order of hierarchy (highest to lowest).
 */
export const ALL_ROLES: UserRole[] = ['dev', 'owner', 'bdm', 'team_leader', 'team_member'];

/**
 * Display names for roles.
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  dev: 'Developer',
  owner: 'Owner',
  bdm: 'Business Development Manager',
  team_leader: 'Team Leader',
  team_member: 'Team Member',
};
