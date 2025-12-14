
import { supabase } from './client';
import { subscribeToTable, unsubscribeFromTable, RealtimePayload } from './realtimeService';

export interface HelpRequest {
    id: string;
    team_id: string;
    volunteer_id: string;
    message: string;
    status: 'pending' | 'acknowledged' | 'resolved';
    created_at: string;
    // Joins
    profiles?: {
        name: string;
        phone?: string;
    };
    latitude?: number;
    longitude?: number;
}

export async function sendHelpRequest(
    teamId: string,
    message: string,
    location?: { lat: number; lng: number },
    buildingName?: string
): Promise<{ success: boolean; request?: HelpRequest; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('help_requests')
            .insert({
                team_id: teamId,
                volunteer_id: user.id,
                message,
                latitude: location?.lat,
                longitude: location?.lng,
                building_name: buildingName
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, request: data as HelpRequest };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send help request';
        return { success: false, error: message };
    }
}

export function subscribeToHelpRequests(
    teamId: string,
    callback: (payload: RealtimePayload<HelpRequest>) => void
): () => Promise<void> {

    subscribeToTable<HelpRequest>(
        'help_requests',
        { column: 'team_id', value: teamId },
        callback
    );

    return () => unsubscribeFromTable('help_requests', { column: 'team_id', value: teamId });
}

export async function resolveRequest(requestId: string): Promise<void> {
    await supabase.from('help_requests').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', requestId);
}

export async function getHelpRequests(teamId: string): Promise<{ success: boolean; requests?: HelpRequest[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('help_requests')
            .select(`
                *,
                profiles:volunteer_id (
                    name,
                    phone
                )
            `)
            .eq('team_id', teamId)
            .neq('status', 'resolved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, requests: data as HelpRequest[] };
    } catch (err) {
        return { success: false, error: 'Failed to fetch help requests' };
    }
}
