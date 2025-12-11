
import { supabase } from './client';

export interface Announcement {
    id: string;
    team_id: string;
    content: string;
    created_by: string;
    created_at: string;
    priority: 'normal' | 'high';
    // Joined Fields
    profiles?: {
        name: string;
        role: string;
    };
}

/**
 * Fetches announcements for the current user's team
 */
export async function getAnnouncements(teamId: string): Promise<{
    success: boolean;
    announcements?: Announcement[];
    error?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('team_announcements')
            .select(`
        *,
        profiles (
          name,
          role
        )
      `)
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(10); // Last 10 announcements

        if (error) {
            console.error('Error fetching announcements:', error);
            return { success: false, error: 'Failed to load announcements' };
        }

        const announcements = (data || []).map(item => ({
            ...item,
            profiles: item.profiles
        })) as Announcement[];

        return { success: true, announcements };
    } catch (err) {
        return { success: false, error: 'Failed to load announcements' };
    }
}

/**
 * Creates a new announcement
 */
export async function createAnnouncement(
    teamId: string,
    content: string,
    priority: 'normal' | 'high' = 'normal'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { error } = await supabase
            .from('team_announcements')
            .insert({
                team_id: teamId,
                content,
                created_by: user.id,
                priority
            });

        if (error) {
            console.error('Error creating announcement:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'Failed to post announcement' };
    }
}
