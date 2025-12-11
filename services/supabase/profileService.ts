import { supabase } from './client';
import type { AccessibilitySettings } from '../../types';
import { canAssignRole, MAX_OWNERS } from '../../utils/rolePermissions';

// User role types matching database enum
export type UserRole = 'dev' | 'owner' | 'bdm' | 'team_leader' | 'team_member';

// User profile interface matching database schema
export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  accessibility_settings: AccessibilitySettings;
  created_at: string;
  updated_at: string;
}

// Input type for creating/updating profiles
export interface ProfileInput {
  name: string;
  email?: string;
  accessibility_settings?: AccessibilitySettings;
}

// Default accessibility settings
const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrastMode: false,
  largerTouchTargets: false,
  fontSize: 'normal',
};

/**
 * Gets a user profile by user ID
 * Requirements: 19.2
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 means no rows returned - user doesn't have a profile yet
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching profile:', error.message);
      return null;
    }

    return data as UserProfile;
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
}


/**
 * Gets the current user's profile
 * Requirements: 19.2
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return getProfile(user.id);
  } catch (err) {
    console.error('Error fetching current profile:', err);
    return null;
  }
}

/**
 * Creates or updates a user profile
 * Requirements: 19.1, 19.3, 19.4
 */
export async function upsertProfile(
  profile: ProfileInput
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate name is provided
    if (!profile.name || profile.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    // Validate email format if provided
    if (profile.email && !isValidEmail(profile.email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const profileData = {
      id: user.id,
      phone: user.phone || '',
      name: profile.name.trim(),
      email: profile.email?.trim() || null,
      accessibility_settings: profile.accessibility_settings || DEFAULT_ACCESSIBILITY_SETTINGS,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error.message);
      return { success: false, error: 'Failed to save profile' };
    }

    return { success: true, profile: data as UserProfile };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save profile';
    return { success: false, error: message };
  }
}

/**
 * Updates specific fields of the current user's profile
 * Requirements: 19.3, 19.4
 */
export async function updateProfile(
  updates: Partial<ProfileInput>
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { success: false, error: 'Name cannot be empty' };
    }

    // Validate email format if provided
    if (updates.email && !isValidEmail(updates.email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email?.trim() || null;
    }
    if (updates.accessibility_settings !== undefined) {
      updateData.accessibility_settings = updates.accessibility_settings;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error: 'Failed to update profile' };
    }

    return { success: true, profile: data as UserProfile };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return { success: false, error: message };
  }
}


/**
 * Gets the role of a user
 * Requirements: 4.1
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error.message);
      return null;
    }

    return data?.role as UserRole || null;
  } catch (err) {
    console.error('Error fetching user role:', err);
    return null;
  }
}

/**
 * Gets the current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return getUserRole(user.id);
  } catch (err) {
    console.error('Error fetching current user role:', err);
    return null;
  }
}

/**
 * Updates accessibility settings for the current user
 * Requirements: 17.4
 */
export async function updateAccessibilitySettings(
  settings: AccessibilitySettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        accessibility_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating accessibility settings:', error.message);
      return { success: false, error: 'Failed to save settings' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return { success: false, error: message };
  }
}

/**
 * Gets accessibility settings for the current user
 * Requirements: 17.5
 */
export async function getAccessibilitySettings(): Promise<AccessibilitySettings> {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || !profile.accessibility_settings) {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }

    return profile.accessibility_settings;
  } catch (err) {
    console.error('Error fetching accessibility settings:', err);
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a profile exists for the current user
 */
export async function hasProfile(): Promise<boolean> {
  try {
    const profile = await getCurrentProfile();
    return profile !== null && profile.name.length > 0;
  } catch (err) {
    console.error('Error checking if profile exists:', err);
    return false;
  }
}

/**
 * Counts the current number of users with the Owner role.
 * Used to enforce the max 3 owners constraint.
 * Requirements: 4.3, 5.6
 */
export async function countOwners(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner');

    if (error) {
      console.error('Error counting owners:', error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error counting owners:', err);
    return 0;
  }
}

/**
 * Logs a role change to the audit log.
 * Only logs changes involving the Owner role.
 * Requirements: 4.5
 */
async function logRoleChange(
  changedBy: string,
  targetUser: string,
  oldRole: UserRole | null,
  newRole: UserRole
): Promise<void> {
  // Only log changes involving owner role
  if (oldRole !== 'owner' && newRole !== 'owner') {
    return;
  }

  try {
    const { error } = await supabase
      .from('role_audit_log')
      .insert({
        changed_by: changedBy,
        target_user: targetUser,
        old_role: oldRole,
        new_role: newRole,
      });

    if (error) {
      console.error('Error logging role change:', error.message);
    }
  } catch (err) {
    console.error('Error logging role change:', err);
  }
}

/**
 * Updates a user's role with permission checks.
 * 
 * Permission rules:
 * - Dev: Can assign any role including Owner (max 3 owners)
 * - Owner: Can assign BDM, Team Leader, Team Member (not Owner)
 * - BDM: Can assign Team Leader, Team Member (not Owner, BDM)
 * - Team Leader: Can assign Team Member only within their team
 * - Team Member: Cannot assign any roles
 * 
 * Requirements: 4.1, 4.3, 4.4, 5.7
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current user's role
    const currentUserRole = await getUserRole(user.id);
    
    if (!currentUserRole) {
      return { success: false, error: 'Could not determine your role' };
    }

    // Check if current user can assign the target role
    if (!canAssignRole(currentUserRole, newRole)) {
      return { 
        success: false, 
        error: 'You do not have permission to assign this role' 
      };
    }

    // Get target user's current role for audit logging
    const targetCurrentRole = await getUserRole(targetUserId);

    // Check max owners constraint if assigning owner role
    if (newRole === 'owner') {
      const ownerCount = await countOwners();
      
      // If target is already an owner, don't count them twice
      const effectiveCount = targetCurrentRole === 'owner' ? ownerCount : ownerCount;
      
      if (effectiveCount >= MAX_OWNERS && targetCurrentRole !== 'owner') {
        return { 
          success: false, 
          error: `Cannot add more owners. Maximum of ${MAX_OWNERS} owners allowed` 
        };
      }
    }

    // Update the role
    const { error } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) {
      console.error('Error updating user role:', error.message);
      return { success: false, error: 'Failed to update role' };
    }

    // Log the role change (only for owner role changes)
    await logRoleChange(user.id, targetUserId, targetCurrentRole, newRole);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update role';
    return { success: false, error: message };
  }
}

/**
 * Demotes a user from Owner role to a specified role or Team Member.
 * Only Dev can demote owners.
 * Requirements: 4.4
 */
export async function demoteOwner(
  targetUserId: string,
  newRole: UserRole = 'team_member'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current user's role - only dev can demote owners
    const currentUserRole = await getUserRole(user.id);
    
    if (currentUserRole !== 'dev') {
      return { 
        success: false, 
        error: 'Only developers can demote owners' 
      };
    }

    // Verify target is actually an owner
    const targetCurrentRole = await getUserRole(targetUserId);
    
    if (targetCurrentRole !== 'owner') {
      return { 
        success: false, 
        error: 'Target user is not an owner' 
      };
    }

    // Cannot demote to owner or dev
    if (newRole === 'owner' || newRole === 'dev') {
      return { 
        success: false, 
        error: 'Invalid demotion target role' 
      };
    }

    // Update the role
    const { error } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) {
      console.error('Error demoting owner:', error.message);
      return { success: false, error: 'Failed to demote owner' };
    }

    // Log the role change
    await logRoleChange(user.id, targetUserId, 'owner', newRole);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to demote owner';
    return { success: false, error: message };
  }
}
