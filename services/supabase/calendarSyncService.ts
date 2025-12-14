
import { supabase } from './client';

export interface CalendarEvent {
    id: string;
    user_id: string;
    apartment_id: string;
    floor: number;
    room_number_val: string;
    external_event_id?: string;
    scheduled_time: string;
}

/**
 * Checks if calendar sync is enabled/authorized
 * For now, just checks if we have a token (placeholder) or permission
 */
export async function isCalendarSyncEnabled(): Promise<boolean> {
    // Placeholder: Logic to check if user has authorized Google Calendar
    return false;
}

/**
 * Adds a callback to the database and attempts to sync with Calendar
 */
export async function addCallbackEvent(
    apartmentId: string,
    floor: number,
    roomNumber: string,
    scheduledTime: string,
    notes?: string
): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        // 1. Save to DB
        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                user_id: user.id,
                apartment_id: apartmentId,
                floor: floor,
                room_number_val: roomNumber,
                scheduled_time: scheduledTime
            })
            .select()
            .single();

        if (error) throw error;
        const event = data as CalendarEvent;

        // 2. Sync to Google Calendar (if enabled)
        // Note: This would typically involve using the Google Calendar API
        // For now, we'll return the event and the UI can handle the 'Add to Calendar' link generation
        // if sync is not fully automated.

        return { success: true, event };

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        return { success: false, error: message };
    }
}

/**
 * Generate a Google Calendar Link for manual addition
 */
export function generateGoogleCalendarLink(
    title: string,
    description: string,
    startTime: Date,
    location?: string
): string {
    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const start = formatTime(startTime);
    const end = formatTime(new Date(startTime.getTime() + 60 * 60 * 1000)); // Default 1 hour

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', title);
    url.searchParams.append('details', description);
    url.searchParams.append('dates', `${start}/${end}`);
    if (location) url.searchParams.append('location', location);

    return url.toString();
}
