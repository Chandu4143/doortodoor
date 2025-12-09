/**
 * Team Service
 * Handles team creation, joining, and management operations
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 7.4, 7.5, 20.1
 */

import { supabase } from './client';
import { generateTeamCode, validateTeamCodeFormat, normalizeTeamCode } from '../../utils/teamCode';
import { getCurrentUserRole, type UserRole } from './profileService';

// Team role types matching database enum
export type TeamRole = 'leader' | 'member';

// Team interface matching database schema
export interface Team {
  id: string;
  name: string;
  description?: string;
  team_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Team membership interface
export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  team_role: TeamRole;
  joined_at: string;
}

// Team member with profile info
export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  team_role: TeamRole;
  joined_at: string;
  profile: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: UserRole;
  };
}

// Input for creating a team
export interface CreateTeamInput {
  name: string;
  description?: string;
}

// Input for updating a team
export interface UpdateTeamInput {
  name?: string;
  description?: string;
}


/**
 * Generates a unique team code that doesn't exist in the database
 * Retries up to 5 times if collision occurs
 * Requirements: 2.1, 2.5
 */
async function generateUniqueTeamCode(): Promise<string> {
  const maxAttempts = 5;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateTeamCode();
    
    // Check if code already exists
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .eq('team_code', code)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking team code uniqueness:', error.message);
      continue;
    }
    
    // If no existing team with this code, return it
    if (!data) {
      return code;
    }
  }
  
  throw new Error('Failed to generate unique team code after multiple attempts');
}

/**
 * Creates a new team (Owner/BDM only)
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function createTeam(
  input: CreateTeamInput
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check user role - only Owner and BDM can create teams
    const userRole = await getCurrentUserRole();
    
    if (!userRole || !['dev', 'owner', 'bdm'].includes(userRole)) {
      return { 
        success: false, 
        error: 'You do not have permission to create teams' 
      };
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Team name is required' };
    }

    // Generate unique team code
    const teamCode = await generateUniqueTeamCode();

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        team_code: teamCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError.message);
      return { success: false, error: 'Failed to create team' };
    }

    // Add creator as team leader
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .insert({
        team_id: team.id,
        user_id: user.id,
        team_role: 'leader',
      });

    if (membershipError) {
      console.error('Error adding creator to team:', membershipError.message);
      // Team was created but membership failed - still return success
      // The user can be added later
    }

    return { success: true, team: team as Team };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create team';
    return { success: false, error: message };
  }
}

/**
 * Joins a team using a team code
 * Requirements: 3.1, 3.2, 3.3
 */
export async function joinTeam(
  teamCode: string
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate team code format
    if (!validateTeamCodeFormat(teamCode)) {
      return { success: false, error: 'Invalid team code format' };
    }

    // Normalize the code for lookup
    const normalizedCode = normalizeTeamCode(teamCode);

    // Find the team by code
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('team_code', normalizedCode)
      .maybeSingle();

    if (teamError) {
      console.error('Error finding team:', teamError.message);
      return { success: false, error: 'Failed to find team' };
    }

    if (!team) {
      return { success: false, error: 'Invalid team code. Please check and try again' };
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, error: 'You are already a member of this team' };
    }

    // Add user as team member
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .insert({
        team_id: team.id,
        user_id: user.id,
        team_role: 'member',
      });

    if (membershipError) {
      console.error('Error joining team:', membershipError.message);
      return { success: false, error: 'Failed to join team' };
    }

    return { success: true, team: team as Team };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join team';
    return { success: false, error: message };
  }
}


/**
 * Gets all teams the current user belongs to
 * Requirements: 3.5
 */
export async function getUserTeams(): Promise<{ 
  success: boolean; 
  teams?: (Team & { team_role: TeamRole })[]; 
  error?: string 
}> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's team memberships with team details
    const { data, error } = await supabase
      .from('team_memberships')
      .select(`
        team_role,
        teams (
          id,
          name,
          description,
          team_code,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user teams:', error.message);
      return { success: false, error: 'Failed to fetch teams' };
    }

    // Transform the data to include team_role at the team level
    const teams = (data || [])
      .filter(item => item.teams)
      .map(item => ({
        ...(item.teams as unknown as Team),
        team_role: item.team_role as TeamRole,
      }));

    return { success: true, teams };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch teams';
    return { success: false, error: message };
  }
}

/**
 * Gets a team by ID
 */
export async function getTeam(
  teamId: string
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Team not found' };
      }
      console.error('Error fetching team:', error.message);
      return { success: false, error: 'Failed to fetch team' };
    }

    return { success: true, team: data as Team };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team';
    return { success: false, error: message };
  }
}

/**
 * Gets a team by team code
 */
export async function getTeamByCode(
  teamCode: string
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    if (!validateTeamCodeFormat(teamCode)) {
      return { success: false, error: 'Invalid team code format' };
    }

    const normalizedCode = normalizeTeamCode(teamCode);

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('team_code', normalizedCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching team by code:', error.message);
      return { success: false, error: 'Failed to fetch team' };
    }

    if (!data) {
      return { success: false, error: 'Team not found' };
    }

    return { success: true, team: data as Team };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team';
    return { success: false, error: message };
  }
}

/**
 * Gets all members of a team
 * Requirements: 20.1
 */
export async function getTeamMembers(
  teamId: string
): Promise<{ success: boolean; members?: TeamMember[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('team_memberships')
      .select(`
        id,
        user_id,
        team_id,
        team_role,
        joined_at,
        profiles (
          id,
          name,
          phone,
          email,
          role
        )
      `)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error fetching team members:', error.message);
      return { success: false, error: 'Failed to fetch team members' };
    }

    // Transform the data
    const members = (data || [])
      .filter(item => item.profiles)
      .map(item => ({
        id: item.id,
        user_id: item.user_id,
        team_id: item.team_id,
        team_role: item.team_role as TeamRole,
        joined_at: item.joined_at,
        profile: item.profiles as unknown as TeamMember['profile'],
      }));

    return { success: true, members };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team members';
    return { success: false, error: message };
  }
}


/**
 * Removes a member from a team
 * Only Team Leaders, BDMs, and Owners can remove members
 * Requirements: 7.4
 */
export async function removeMember(
  teamId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Cannot remove yourself
    if (user.id === userId) {
      return { success: false, error: 'You cannot remove yourself from the team' };
    }

    // Check current user's global role
    const userRole = await getCurrentUserRole();
    
    // Check if user is admin (dev, owner, bdm)
    const isAdmin = userRole && ['dev', 'owner', 'bdm'].includes(userRole);

    // If not admin, check if user is team leader
    if (!isAdmin) {
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('team_role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership || membership.team_role !== 'leader') {
        return { 
          success: false, 
          error: 'You do not have permission to remove team members' 
        };
      }
    }

    // Remove the member
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing team member:', error.message);
      return { success: false, error: 'Failed to remove team member' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove team member';
    return { success: false, error: message };
  }
}

/**
 * Updates team details
 * Only Team Leaders, BDMs, and Owners can update teams
 * Requirements: 7.5
 */
export async function updateTeam(
  teamId: string,
  updates: UpdateTeamInput
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check current user's global role
    const userRole = await getCurrentUserRole();
    
    // Check if user is admin (dev, owner, bdm)
    const isAdmin = userRole && ['dev', 'owner', 'bdm'].includes(userRole);

    // If not admin, check if user is team leader
    if (!isAdmin) {
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('team_role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership || membership.team_role !== 'leader') {
        return { 
          success: false, 
          error: 'You do not have permission to update this team' 
        };
      }
    }

    // Validate updates
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { success: false, error: 'Team name cannot be empty' };
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null;
    }

    // Update the team
    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team:', error.message);
      return { success: false, error: 'Failed to update team' };
    }

    return { success: true, team: data as Team };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update team';
    return { success: false, error: message };
  }
}

/**
 * Updates a team member's role within the team
 * Only Team Leaders (for their team), BDMs, and Owners can update member roles
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check current user's global role
    const userRole = await getCurrentUserRole();
    
    // Check if user is admin (dev, owner, bdm)
    const isAdmin = userRole && ['dev', 'owner', 'bdm'].includes(userRole);

    // If not admin, check if user is team leader
    if (!isAdmin) {
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('team_role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership || membership.team_role !== 'leader') {
        return { 
          success: false, 
          error: 'You do not have permission to update member roles' 
        };
      }
    }

    // Update the member's role
    const { error } = await supabase
      .from('team_memberships')
      .update({ team_role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating member role:', error.message);
      return { success: false, error: 'Failed to update member role' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update member role';
    return { success: false, error: message };
  }
}

/**
 * Checks if the current user is a member of a team
 */
export async function isTeamMember(
  teamId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error('Error checking team membership:', err);
    return false;
  }
}

/**
 * Gets the current user's role in a specific team
 */
export async function getUserTeamRole(
  teamId: string
): Promise<TeamRole | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data } = await supabase
      .from('team_memberships')
      .select('team_role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    return data?.team_role as TeamRole || null;
  } catch (err) {
    console.error('Error getting user team role:', err);
    return null;
  }
}

/**
 * Leaves a team (removes current user from team)
 */
export async function leaveTeam(
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is the only leader
    const { data: leaders } = await supabase
      .from('team_memberships')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('team_role', 'leader');

    if (leaders && leaders.length === 1 && leaders[0].user_id === user.id) {
      // Check if there are other members
      const { count } = await supabase
        .from('team_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (count && count > 1) {
        return { 
          success: false, 
          error: 'You are the only team leader. Please assign another leader before leaving.' 
        };
      }
    }

    // Remove the user from the team
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving team:', error.message);
      return { success: false, error: 'Failed to leave team' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to leave team';
    return { success: false, error: message };
  }
}
