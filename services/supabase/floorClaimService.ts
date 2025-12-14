
import { supabase } from './client';
import { subscribeToTable, unsubscribeFromTable, RealtimePayload } from './realtimeService';

export interface FloorClaim {
    id: string;
    apartment_id: string;
    floor: number;
    user_id: string;
    claimed_at: string;
    last_activity_at: string;
    // Joins
    profiles?: {
        name: string;
        avatar_url?: string;
    };
}

export interface CreateClaimInput {
    apartmentId: string;
    floor: number;
}

/**
 * Claims a floor for the current user
 */
export async function claimFloor(
    input: CreateClaimInput
): Promise<{ success: boolean; claim?: FloorClaim; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('floor_claims')
            .insert({
                apartment_id: input.apartmentId,
                floor: input.floor,
                user_id: user.id,
            })
            .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
            .single();

        if (error) {
            // Check for unique violation
            if (error.code === '23505') {
                return { success: false, error: 'Floor is already claimed' };
            }
            console.error('Error claiming floor:', error.message);
            return { success: false, error: 'Failed to claim floor' };
        }

        return { success: true, claim: data as FloorClaim };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to claim floor';
        return { success: false, error: message };
    }
}

/**
 * Releases a floor claim
 */
export async function releaseFloor(
    input: { apartmentId: string; floor: number }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { error } = await supabase
            .from('floor_claims')
            .delete()
            .match({
                apartment_id: input.apartmentId,
                floor: input.floor,
                user_id: user.id
            });

        if (error) {
            console.error('Error releasing floor:', error.message);
            return { success: false, error: 'Failed to release floor' };
        }

        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to release floor';
        return { success: false, error: message };
    }
}

/**
 * Gets all claims for an apartment
 */
export async function getClaimsForApartment(
    apartmentId: string
): Promise<{ success: boolean; claims?: FloorClaim[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('floor_claims')
            .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
            .eq('apartment_id', apartmentId);

        if (error) {
            console.error('Error fetching claims:', error.message);
            return { success: false, error: 'Failed to fetch claims' };
        }

        return { success: true, claims: data as FloorClaim[] };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch claims';
        return { success: false, error: message };
    }
}

/**
 * Subscribes to claims for an apartment
 */
export function subscribeToClaims(
    apartmentId: string,
    callback: (payload: RealtimePayload<FloorClaim>) => void
): () => Promise<void> {
    subscribeToTable<FloorClaim>(
        'floor_claims',
        { column: 'apartment_id', value: apartmentId },
        callback
    );

    return () => unsubscribeFromTable('floor_claims', { column: 'apartment_id', value: apartmentId });
}

/**
 * Updates the last activity timestamp for a claim to prevent it from decaying
 */
export async function heartbeatClaim(
    apartmentId: string,
    floor: number
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('floor_claims')
            .update({ last_activity_at: new Date().toISOString() })
            .match({
                apartment_id: apartmentId,
                floor: floor,
                user_id: user.id
            });
    } catch (e) {
        // Silent fail for heartbeat
        console.error('Heartbeat failed', e);
    }
}
