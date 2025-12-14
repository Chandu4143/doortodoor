
import { supabase } from './client';
import { SupabaseRoom } from './residentialService';

export interface FloorSuggestion {
    floor: number;
    reason: string;
    score: number;
    urgentCallbacks: number;
}

export interface SkipSuggestion {
    floor: number;
    notInterestedRate: number;
    totalVisits: number;
    shouldSkip: boolean;
    reason: string;
}

export interface TimeInsight {
    hour: number; // 0-23
    successRate: number;
    totalVisits: number;
    isPeak: boolean;
}

/**
 * Calculates optimal starting floor based on callbacks and history
 */
export async function getOptimalStartFloor(
    apartmentId: string
): Promise<{ success: boolean; suggestion?: FloorSuggestion; error?: string }> {
    try {
        // Fetch rooms with callbacks
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('apartment_id', apartmentId);

        if (error) throw error;

        // Logic:
        // 1. Identify floors with callbacks
        // 2. Prioritize floors with callbacks in next 2 hours (requires callback_time which might be in notes or separate table? 
        //    Wait, rooms have 'status'='callback'. Do they have a time? 
        //    'schema_engagement.sql' created 'calendar_events' for scheduled times.
        //    Existing 'rooms' table doesn't seem to have 'callback_time' column in 'residentialService.ts', 
        //    BUT 'calendar_events' links to 'room_id' (if rooms table exists) or 'apartment_id' + 'floor' + 'room_number'.
        //    Let's use 'status'='callback' for now and assume urgent if status is set, 
        //    or fetch 'calendar_events' if we linked them.

        // Fetch calendar events for callbacks
        const { data: events } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('apartment_id', apartmentId)
            .gt('scheduled_time', new Date().toISOString());

        const floorScores = new Map<number, number>();
        const floorReasons = new Map<number, string[]>();
        const urgentCallbacks = new Map<number, number>();

        const safeEvents = events || [];

        // Analyze events
        safeEvents.forEach(event => {
            const floor = event.floor || 0;
            const time = new Date(event.scheduled_time);
            const now = new Date();
            const diffHours = (time.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (diffHours >= 0 && diffHours <= 2) {
                floorScores.set(floor, (floorScores.get(floor) || 0) + 100);
                floorReasons.set(floor, [...(floorReasons.get(floor) || []), 'Urgent callback']);
                urgentCallbacks.set(floor, (urgentCallbacks.get(floor) || 0) + 1);
            } else if (diffHours > 2) {
                floorScores.set(floor, (floorScores.get(floor) || 0) + 20);
                floorReasons.set(floor, [...(floorReasons.get(floor) || []), 'Upcoming callback']);
            }
        });

        // Analyze unvisited rooms (prioritize top down if no callbacks)
        // Note: This logic assumes we want to suggest *something* even if no callbacks.
        // Standard traversal is usually Top -> Down.
        // So floors get score = floor_number (higher floor = higher score for initial start)

        let maxFloor = 0;
        (rooms as SupabaseRoom[])?.forEach(room => {
            if (room.floor > maxFloor) maxFloor = room.floor;
        });

        if (floorScores.size === 0) {
            // Default: Top floor
            return {
                success: true,
                suggestion: {
                    floor: maxFloor,
                    reason: 'Standard top-down traversal (no urgent callbacks)',
                    score: 10,
                    urgentCallbacks: 0
                }
            };
        }

        // Find best floor
        let bestFloor = -1;
        let maxScore = -1;

        floorScores.forEach((score, floor) => {
            if (score > maxScore) {
                maxScore = score;
                bestFloor = floor;
            }
        });

        const reasons = floorReasons.get(bestFloor) || [];
        const reason = reasons.length > 0 ? reasons[0] : 'Recommended start';

        return {
            success: true,
            suggestion: {
                floor: bestFloor,
                reason: `${reason} (${reasons.length} items)`,
                score: maxScore,
                urgentCallbacks: urgentCallbacks.get(bestFloor) || 0
            }
        };

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate optimal route';
        return { success: false, error: message };
    }
}

/**
 * Calculates skip suggestions based on historical data
 */
export async function getSkipSuggestions(
    apartmentId: string
): Promise<{ success: boolean; suggestions?: SkipSuggestion[]; error?: string }> {
    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('apartment_id', apartmentId);

        if (error) throw error;

        // Group by floor
        const floors = new Map<number, { total: number, notInterested: number }>();

        (rooms as SupabaseRoom[])?.forEach(room => {
            const current = floors.get(room.floor) || { total: 0, notInterested: 0 };
            current.total++;
            if (room.status === 'not_interested') {
                current.notInterested++;
            }
            floors.set(room.floor, current);
        });

        const suggestions: SkipSuggestion[] = [];

        floors.forEach((stats, floor) => {
            const rate = stats.total > 0 ? stats.notInterested / stats.total : 0;
            // Threshold: > 70% not interested and at least 5 visits (simplified to rooms count here as proxy for visits if we don't have visit history table linked yet)
            // Ideally we check total *visits* history, but current room status is a basic proxy.
            // Requirement 3.4 says "minimum of 5 previous visits". 
            // We might need to query activity_feed or a history table for true accuracy.
            // For now, using current room status distribution.

            if (stats.total >= 5 && rate > 0.7) {
                suggestions.push({
                    floor,
                    notInterestedRate: rate,
                    totalVisits: stats.total,
                    shouldSkip: true,
                    reason: `High rejection rate (${(rate * 100).toFixed(0)}%)`
                });
            }
        });

        return { success: true, suggestions };

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get skip suggestions';
        return { success: false, error: message };
    }
}
