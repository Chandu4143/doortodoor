
import { supabase } from './client';
import { UserRole, updateUserRole } from './profileService';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleRequest {
    id: string;
    user_id: string;
    requested_role: 'owner' | 'bdm';
    status: RequestStatus;
    created_at: string;
    updated_at: string;
    // Joins
    profiles?: {
        name: string;
        email: string;
        phone: string;
    };
}

/**
 * Creates a new role request for the current user
 */
export async function createRoleRequest(
    role: 'owner' | 'bdm'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check for existing pending request
        const { data: existing, error: checkError } = await supabase
            .from('role_requests')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        // Handle missing table gracefully
        if (checkError && (checkError.message.includes('role_requests') || checkError.code === '42P01' || checkError.message.includes('schema cache'))) {
            return { success: false, error: 'This feature is not available yet. Please contact an administrator.' };
        }

        if (existing) {
            return { success: false, error: 'You already have a pending request' };
        }

        const { error } = await supabase
            .from('role_requests')
            .insert({
                user_id: user.id,
                requested_role: role,
            });

        if (error) {
            // Handle missing table gracefully
            if (error.message.includes('role_requests') || error.code === '42P01' || error.message.includes('schema cache')) {
                return { success: false, error: 'This feature is not available yet. Please contact an administrator.' };
            }
            console.error('Error creating role request:', error.message);
            return { success: false, error: 'Failed to submit request' };
        }

        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit request';
        return { success: false, error: message };
    }
}

/**
 * Gets all pending role requests (Admin only)
 */
export async function getPendingRequests(): Promise<{
    success: boolean;
    requests?: RoleRequest[];
    error?: string
}> {
    try {
        const { data, error } = await supabase
            .from('role_requests')
            .select(`
        *,
        profiles (
          name,
          email,
          phone
        )
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            // Handle missing table gracefully - this is optional functionality
            if (error.message.includes('role_requests') || error.code === '42P01' || error.message.includes('schema cache')) {
                console.warn('Role requests table not found - feature disabled');
                return { success: true, requests: [] };
            }
            console.error('Error fetching requests:', error.message);
            return { success: false, error: 'Failed to fetch requests' };
        }

        // Flatten profile data effectively
        const requests = (data || []).map(item => ({
            ...item,
            // @ts-ignore - Supabase types join handling
            profiles: item.profiles
        })) as RoleRequest[];

        return { success: true, requests };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch requests';
        return { success: false, error: message };
    }
}

/**
 * Approves a role request
 * 1. Updates the user's role in profiles table
 * 2. Updates the request status to 'approved'
 */
export async function approveRequest(
    requestId: string,
    userId: string,
    role: 'owner' | 'bdm'
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Update the user's role
        const roleUpdate = await updateUserRole(userId, role);

        if (!roleUpdate.success) {
            return { success: false, error: roleUpdate.error };
        }

        // 2. Update request status
        const { error } = await supabase
            .from('role_requests')
            .update({
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error updating request status:', error.message);
            // Warning: User role was updated but request status failed. 
            // In a real app, we'd want a transaction here.
            return { success: true }; // Return success as the main action (role update) worked
        }

        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve request';
        return { success: false, error: message };
    }
}

/**
 * Rejects a role request
 */
export async function rejectRequest(
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('role_requests')
            .update({
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error rejecting request:', error.message);
            return { success: false, error: 'Failed to reject request' };
        }

        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject request';
        return { success: false, error: message };
    }
}
