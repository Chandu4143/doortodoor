/**
 * Sync Service
 * Bridges UI actions with Supabase and Offline Queue
 * Requirements: Phase 4 (Offline Sync)
 */

import {
    updateRoom,
    createApartment,
    deleteApartment,
    type UpdateRoomInput,
    type CreateApartmentInput
} from './supabase/residentialService';
import {
    queueOfflineChange,
    registerSyncHandler,
    getOnlineStatus,
    type PendingChange
} from '../utils/offlineQueue';

// Register Sync Handlers
export function initializeSyncHandlers() {
    registerSyncHandler('room', async (change: PendingChange) => {
        if (change.action === 'update') {
            const { roomId, updates } = change.data as { roomId: string, updates: UpdateRoomInput };
            return await updateRoom(roomId, updates);
        }
        return { success: false, error: 'Unknown room action' };
    });

    registerSyncHandler('apartment', async (change: PendingChange) => {
        if (change.action === 'create') {
            const { teamId, input } = change.data as { teamId: string, input: CreateApartmentInput };
            // Note: If we created it offline, we might have a temp ID. 
            // In a complex app, we'd need to swap IDs. 
            // For this phase, we'll assume "create" sync is best-effort or limited.
            // Actually, Supabase returns the real ID. We might generally just retry the create.
            return await createApartment(teamId, input);
        }
        if (change.action === 'delete') {
            const { apartmentId } = change.data as { apartmentId: string };
            return await deleteApartment(apartmentId);
        }
        return { success: false, error: 'Unknown apartment action' };
    });
}

// Wrapper Functions for UI

export async function syncUpdateRoom(roomId: string, updates: UpdateRoomInput) {
    if (getOnlineStatus()) {
        try {
            const result = await updateRoom(roomId, updates);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err) {
            console.warn('Online update failed, queuing offline:', err);
            // Fallthrough to queue
        }
    }

    // Queue for later
    queueOfflineChange({
        type: 'room',
        action: 'update',
        entityId: roomId,
        data: { roomId, updates }
    });

    return { success: true, queued: true };
}

export async function syncCreateApartment(teamId: string, input: CreateApartmentInput) {
    // Apartment creation is complex because of IDs. 
    // We ideally should generate a UUID locally if possible, OR block UI.
    // For this app, we will try online first, and if offline, we strictly queue it 
    // effectively "optimistic" but we can't get the real ID until sync.
    // This might require the UI to handle "Pending" apartments.

    if (getOnlineStatus()) {
        try {
            const result = await createApartment(teamId, input);
            if (!result.success) throw new Error(result.error);
            return result;
        } catch (err) {
            console.warn('Online create failed, queuing:', err);
        }
    }

    queueOfflineChange({
        type: 'apartment',
        action: 'create',
        entityId: 'temp_' + Date.now(),
        data: { teamId, input }
    });

    return { success: true, queued: true };
}

export async function syncDeleteApartment(apartmentId: string) {
    if (getOnlineStatus()) {
        try {
            const result = await deleteApartment(apartmentId);
            if (!result.success) throw new Error(result.error);
            return result;
        } catch (err) {
            console.warn('Online delete failed, queuing:', err);
        }
    }

    queueOfflineChange({
        type: 'apartment',
        action: 'delete',
        entityId: apartmentId,
        data: { apartmentId }
    });

    return { success: true, queued: true };
}
