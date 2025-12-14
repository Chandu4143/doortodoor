
import { supabase } from './client';
// Actually, I'll inline the upload logic if a simple wrapper doesn't exist, or check existing storage usage.

export interface VoiceNote {
    id: string;
    apartment_id: string;
    floor_number: number;
    room_number_val: string;
    audio_path: string;
    transcription: string;
    created_by: string;
    created_at: string;
    // Joins
    profiles?: {
        name: string;
        avatar_url?: string;
    };
}

/**
 * Uploads an audio blob to Supabase Storage and creates a voice_note record
 */
export async function createVoiceNote(
    audioBlob: Blob,
    transcription: string,
    duration: number,
    location: {
        apartmentId: string;
        floor: number;
        roomNumber: string;
    }
): Promise<{ success: boolean; note?: VoiceNote; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        // 1. Upload Audio
        const filename = `${user.id}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('voice-notes')
            .upload(filename, audioBlob);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('voice-notes')
            .getPublicUrl(filename);

        // 2. Create Record
        const { data, error } = await supabase
            .from('voice_notes')
            .insert({
                created_by: user.id,
                apartment_id: location.apartmentId,
                floor_number: location.floor,
                room_number_val: location.roomNumber,
                audio_path: publicUrl,
                transcription: transcription,
            })
            .select(`
                *,
                profiles:created_by (
                    name,
                    avatar_url
                )
            `)
            .single();

        if (error) throw error;

        return { success: true, note: data as VoiceNote };

    } catch (err) {
        console.error('Error creating voice note:', err);
        return { success: false, error: 'Failed to create voice note' };
    }
}

/**
 * Fetch voice notes for a specific room
 */
export async function getVoiceNotesForRoom(
    apartmentId: string,
    roomNumber: string
): Promise<{ success: boolean; notes?: VoiceNote[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('voice_notes')
            .select(`
                *,
                profiles:created_by (
                    name,
                    avatar_url
                )
            `)
            .eq('apartment_id', apartmentId)
            .eq('room_number_val', roomNumber)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, notes: data as VoiceNote[] };
    } catch (err) {
        return { success: false, error: 'Failed to fetch notes' };
    }
}

