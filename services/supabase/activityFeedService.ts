
import { supabase } from './client';
import { subscribeToTable, unsubscribeFromTable, RealtimePayload } from './realtimeService';

export interface ActivityEntry {
    id: string;
    team_id: string;
    volunteer_id: string;
    action_type: 'visit' | 'donation' | 'callback_scheduled' | 'floor_claimed' | 'help_request';
    building_name?: string;
    floor?: number;
    amount?: number;
    created_at: string;
    profiles?: {
        name: string;
    };
}

export async function logActivity(
    teamId: string,
    type: ActivityEntry['action_type'],
    details: { buildingName?: string; floor?: number; amount?: number; roomNumber?: number }
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('activity_feed').insert({
            team_id: teamId,
            volunteer_id: user.id,
            action_type: type,
            building_name: details.buildingName,
            floor: details.floor,
            amount: details.amount,
            room_number: details.roomNumber
        });
    } catch (e) {
        console.error("Log activity failed", e);
    }
}

export function subscribeToFeed(
    teamId: string,
    callback: (payload: RealtimePayload<ActivityEntry>) => void
): () => Promise<void> {
    subscribeToTable<ActivityEntry>(
        'activity_feed',
        { column: 'team_id', value: teamId },
        callback
    );
    return () => unsubscribeFromTable('activity_feed', { column: 'team_id', value: teamId });
}
