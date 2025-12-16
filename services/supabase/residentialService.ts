/**
 * Residential Data Service
 * Handles apartment and room CRUD operations for residential campaigns
 * Requirements: 8.1, 8.2, 9.3, 13.1, 13.2, 22.1, 22.3
 */

import { supabase } from './client';
import { calculateSupportsCount } from '../../utils/donations';
import {
  subscribeToTable,
  unsubscribeFromTable,
  RealtimePayload
} from './realtimeService';

// Room status type matching database enum
export type RoomStatus = 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'other';

// Payment mode type matching database enum
export type PaymentMode = 'cash' | 'upi' | 'card' | 'cheque' | 'online';

// Apartment interface matching database schema
export interface SupabaseApartment {
  id: string;
  team_id: string;
  name: string;
  floors: number;
  units_per_floor: number;
  target_amount: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

// Room interface matching database schema
export interface SupabaseRoom {
  id: string;
  apartment_id: string;
  floor: number;
  room_number: number;
  status: RoomStatus;
  visitor_name: string | null;
  remark: string | null;
  note: string | null;
  // Donor information
  donor_phone: string | null;
  donor_email: string | null;
  donor_address: string | null;
  donor_pan: string | null;
  amount_donated: number;
  supports_count: number;
  payment_mode: PaymentMode | null;
  receipt_number: string | null;
  // Attribution
  collected_by: string | null;
  entered_by: string | null;
  updated_at: string | null;
  created_at: string;
}

// Input for creating an apartment
export interface CreateApartmentInput {
  name: string;
  floors: number;
  units_per_floor: number;
  target_amount?: number;
  latitude?: number;
  longitude?: number;
}

// Input for updating an apartment
export interface UpdateApartmentInput {
  name?: string;
  floors?: number;
  units_per_floor?: number;
  target_amount?: number;
}

// Input for updating a room
export interface UpdateRoomInput {
  status?: RoomStatus;
  visitor_name?: string | null;
  remark?: string | null;
  note?: string | null;
  donor_phone?: string | null;
  donor_email?: string | null;
  donor_address?: string | null;
  donor_pan?: string | null;
  amount_donated?: number;
  payment_mode?: PaymentMode | null;
  receipt_number?: string | null;
  collected_by?: string | null;
}


/**
 * Creates a new apartment for a team with all rooms
 * Uses a database function to create apartment and rooms in a single transaction
 * Requirements: 8.1
 */
export async function createApartment(
  teamId: string,
  input: CreateApartmentInput
): Promise<{ success: boolean; apartment?: SupabaseApartment; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Apartment name is required' };
    }
    if (input.floors < 1) {
      return { success: false, error: 'Floors must be at least 1' };
    }
    if (input.units_per_floor < 1) {
      return { success: false, error: 'Units per floor must be at least 1' };
    }

    // Use the database function to create apartment with rooms in a single transaction
    const { data, error } = await supabase.rpc('create_apartment_with_rooms', {
      p_team_id: teamId,
      p_name: input.name.trim(),
      p_floors: input.floors,
      p_units_per_floor: input.units_per_floor,
      p_target_amount: input.target_amount || 0,
      p_latitude: input.latitude || null,
      p_longitude: input.longitude || null,
    });

    if (error) {
      console.error('Error creating apartment:', error.message, error);
      return { success: false, error: error.message || 'Failed to create apartment' };
    }

    // Parse the JSON response from the function
    // The RPC returns the JSON directly, not wrapped in an array
    const result = data as { success: boolean; apartment?: Record<string, unknown>; error?: string };
    
    console.log('Create apartment result:', result);
    
    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Failed to create apartment' };
    }

    // Convert the apartment data to the expected format
    const apartment = result.apartment ? {
      id: result.apartment.id as string,
      team_id: result.apartment.team_id as string,
      name: result.apartment.name as string,
      floors: result.apartment.floors as number,
      units_per_floor: result.apartment.units_per_floor as number,
      target_amount: result.apartment.target_amount as number,
      latitude: result.apartment.latitude as number | undefined,
      longitude: result.apartment.longitude as number | undefined,
      created_at: result.apartment.created_at as string,
      updated_at: result.apartment.updated_at as string,
    } as SupabaseApartment : undefined;

    return { success: true, apartment };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create apartment';
    return { success: false, error: message };
  }
}

/**
 * Gets all apartments for a team
 * Requirements: 8.1
 */
export async function getApartments(
  teamId: string
): Promise<{ success: boolean; apartments?: SupabaseApartment[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching apartments:', error.message);
      return { success: false, error: 'Failed to fetch apartments' };
    }

    return { success: true, apartments: data as SupabaseApartment[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch apartments';
    return { success: false, error: message };
  }
}

/**
 * Gets a single apartment by ID
 */
export async function getApartment(
  apartmentId: string
): Promise<{ success: boolean; apartment?: SupabaseApartment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Apartment not found' };
      }
      console.error('Error fetching apartment:', error.message);
      return { success: false, error: 'Failed to fetch apartment' };
    }

    return { success: true, apartment: data as SupabaseApartment };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch apartment';
    return { success: false, error: message };
  }
}

/**
 * Updates an apartment
 * Requirements: 8.1
 */
export async function updateApartment(
  apartmentId: string,
  updates: UpdateApartmentInput
): Promise<{ success: boolean; apartment?: SupabaseApartment; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate updates
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { success: false, error: 'Apartment name cannot be empty' };
    }
    if (updates.floors !== undefined && updates.floors < 1) {
      return { success: false, error: 'Floors must be at least 1' };
    }
    if (updates.units_per_floor !== undefined && updates.units_per_floor < 1) {
      return { success: false, error: 'Units per floor must be at least 1' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.floors !== undefined) {
      updateData.floors = updates.floors;
    }
    if (updates.units_per_floor !== undefined) {
      updateData.units_per_floor = updates.units_per_floor;
    }
    if (updates.target_amount !== undefined) {
      updateData.target_amount = updates.target_amount;
    }

    const { data, error } = await supabase
      .from('apartments')
      .update(updateData)
      .eq('id', apartmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating apartment:', error.message);
      return { success: false, error: 'Failed to update apartment' };
    }

    return { success: true, apartment: data as SupabaseApartment };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update apartment';
    return { success: false, error: message };
  }
}

/**
 * Deletes an apartment and all its rooms
 * Requirements: 8.1
 */
export async function deleteApartment(
  apartmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('apartments')
      .delete()
      .eq('id', apartmentId);

    if (error) {
      console.error('Error deleting apartment:', error.message);
      return { success: false, error: 'Failed to delete apartment' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete apartment';
    return { success: false, error: message };
  }
}


// ============================================
// Room Management Functions
// Requirements: 8.1, 8.2, 13.1, 13.2, 22.1, 22.3
// ============================================

/**
 * Creates rooms for an apartment (batch create)
 * Creates all rooms for all floors based on apartment configuration
 * Requirements: 8.1
 * 
 * @param apartmentId - The apartment ID to create rooms for
 * @param floors - Number of floors
 * @param unitsPerFloor - Number of units per floor
 * @returns Result with created rooms or error
 */
export async function createRooms(
  apartmentId: string,
  floors: number,
  unitsPerFloor: number
): Promise<{ success: boolean; rooms?: SupabaseRoom[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    if (floors < 1) {
      return { success: false, error: 'Floors must be at least 1' };
    }
    if (unitsPerFloor < 1) {
      return { success: false, error: 'Units per floor must be at least 1' };
    }

    // Generate room records for all floors
    const roomsToCreate: Array<{
      apartment_id: string;
      floor: number;
      room_number: number;
      status: RoomStatus;
      amount_donated: number;
      supports_count: number;
    }> = [];

    for (let floor = 1; floor <= floors; floor++) {
      for (let unit = 1; unit <= unitsPerFloor; unit++) {
        roomsToCreate.push({
          apartment_id: apartmentId,
          floor: floor,
          room_number: unit,
          status: 'unvisited',
          amount_donated: 0,
          supports_count: 0,
        });
      }
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert(roomsToCreate)
      .select();

    if (error) {
      console.error('Error creating rooms:', error.message);
      return { success: false, error: 'Failed to create rooms' };
    }

    return { success: true, rooms: data as SupabaseRoom[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create rooms';
    return { success: false, error: message };
  }
}

/**
 * Gets all rooms for an apartment
 * Requirements: 8.1
 * 
 * @param apartmentId - The apartment ID to get rooms for
 * @returns Result with rooms or error
 */
export async function getRoomsByApartment(
  apartmentId: string
): Promise<{ success: boolean; rooms?: SupabaseRoom[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('floor', { ascending: true })
      .order('room_number', { ascending: true });

    if (error) {
      console.error('Error fetching rooms:', error.message);
      return { success: false, error: 'Failed to fetch rooms' };
    }

    return { success: true, rooms: data as SupabaseRoom[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
    return { success: false, error: message };
  }
}

/**
 * Gets a single room by ID
 * 
 * @param roomId - The room ID to get
 * @returns Result with room or error
 */
export async function getRoom(
  roomId: string
): Promise<{ success: boolean; room?: SupabaseRoom; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Room not found' };
      }
      console.error('Error fetching room:', error.message);
      return { success: false, error: 'Failed to fetch room' };
    }

    return { success: true, room: data as SupabaseRoom };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch room';
    return { success: false, error: message };
  }
}

/**
 * Updates a room with attribution tracking
 * Requirements: 8.1, 8.2, 13.1, 13.2, 22.1, 22.3
 * 
 * - Automatically calculates supports_count from amount_donated
 * - Sets entered_by to current user
 * - Uses collected_by from input or defaults to current user
 * 
 * @param roomId - The room ID to update
 * @param updates - The fields to update
 * @returns Result with updated room or error
 */
export async function updateRoom(
  roomId: string,
  updates: UpdateRoomInput
): Promise<{ success: boolean; room?: SupabaseRoom; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      entered_by: user.id, // Always set entered_by to current user
    };

    // Copy over provided fields
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.visitor_name !== undefined) {
      updateData.visitor_name = updates.visitor_name;
    }
    if (updates.remark !== undefined) {
      updateData.remark = updates.remark;
    }
    if (updates.note !== undefined) {
      updateData.note = updates.note;
    }
    if (updates.donor_phone !== undefined) {
      updateData.donor_phone = updates.donor_phone;
    }
    if (updates.donor_email !== undefined) {
      updateData.donor_email = updates.donor_email;
    }
    if (updates.donor_address !== undefined) {
      updateData.donor_address = updates.donor_address;
    }
    if (updates.donor_pan !== undefined) {
      updateData.donor_pan = updates.donor_pan;
    }
    if (updates.payment_mode !== undefined) {
      updateData.payment_mode = updates.payment_mode;
    }
    if (updates.receipt_number !== undefined) {
      updateData.receipt_number = updates.receipt_number;
    }

    // Handle amount_donated and calculate supports_count
    if (updates.amount_donated !== undefined) {
      const amount = updates.amount_donated;
      updateData.amount_donated = amount;
      updateData.supports_count = calculateSupportsCount(amount);
    }

    // Handle collected_by attribution
    // Requirements: 22.1, 22.3 - Default to current user if not specified
    if (updates.collected_by !== undefined) {
      updateData.collected_by = updates.collected_by;
    } else {
      // If amount is being set and collected_by not specified, default to current user
      if (updates.amount_donated !== undefined && updates.amount_donated > 0) {
        updateData.collected_by = user.id;
      }
    }

    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      console.error('Error updating room:', error.message);
      return { success: false, error: 'Failed to update room' };
    }

    return { success: true, room: data as SupabaseRoom };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update room';
    return { success: false, error: message };
  }
}

/**
 * Deletes a room
 * 
 * @param roomId - The room ID to delete
 * @returns Result indicating success or error
 */
export async function deleteRoom(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error('Error deleting room:', error.message);
      return { success: false, error: 'Failed to delete room' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete room';
    return { success: false, error: message };
  }
}

/**
 * Gets rooms by floor for an apartment
 * 
 * @param apartmentId - The apartment ID
 * @param floor - The floor number
 * @returns Result with rooms or error
 */
export async function getRoomsByFloor(
  apartmentId: string,
  floor: number
): Promise<{ success: boolean; rooms?: SupabaseRoom[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('apartment_id', apartmentId)
      .eq('floor', floor)
      .order('room_number', { ascending: true });

    if (error) {
      console.error('Error fetching rooms by floor:', error.message);
      return { success: false, error: 'Failed to fetch rooms' };
    }

    return { success: true, rooms: data as SupabaseRoom[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
    return { success: false, error: message };
  }
}

/**
 * Gets rooms collected by a specific user
 * Requirements: 22.5, 22.6 - For calculating individual statistics
 * 
 * @param userId - The user ID who collected the donations
 * @param teamId - Optional team ID to filter by
 * @returns Result with rooms or error
 */
export async function getRoomsByCollector(
  userId: string,
  teamId?: string
): Promise<{ success: boolean; rooms?: SupabaseRoom[]; error?: string }> {
  try {
    let query = supabase
      .from('rooms')
      .select(`
        *,
        apartments!inner(team_id)
      `)
      .eq('collected_by', userId);

    if (teamId) {
      query = query.eq('apartments.team_id', teamId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms by collector:', error.message);
      return { success: false, error: 'Failed to fetch rooms' };
    }

    return { success: true, rooms: data as SupabaseRoom[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
    return { success: false, error: message };
  }
}


// ============================================
// Real-time Subscription Functions
// Requirements: 9.3
// ============================================

/**
 * Subscribes to real-time updates for apartments in a team
 * Requirements: 9.3
 * 
 * @param teamId - The team ID to subscribe to
 * @param callback - Callback function for apartment changes
 * @returns Unsubscribe function
 */
export function subscribeToApartments(
  teamId: string,
  callback: (payload: RealtimePayload<SupabaseApartment>) => void
): () => Promise<void> {
  subscribeToTable<SupabaseApartment>(
    'apartments',
    { column: 'team_id', value: teamId },
    callback
  );

  return () => unsubscribeFromTable('apartments', { column: 'team_id', value: teamId });
}

/**
 * Subscribes to real-time updates for rooms in an apartment
 * Requirements: 9.3
 * 
 * @param apartmentId - The apartment ID to subscribe to
 * @param callback - Callback function for room changes
 * @returns Unsubscribe function
 */
export function subscribeToRooms(
  apartmentId: string,
  callback: (payload: RealtimePayload<SupabaseRoom>) => void
): () => Promise<void> {
  subscribeToTable<SupabaseRoom>(
    'rooms',
    { column: 'apartment_id', value: apartmentId },
    callback
  );

  return () => unsubscribeFromTable('rooms', { column: 'apartment_id', value: apartmentId });
}

/**
 * Subscribes to all room updates across all apartments for a team
 * This requires joining through apartments table, so we subscribe to all rooms
 * and filter in the callback
 * Requirements: 9.3
 * 
 * @param teamId - The team ID
 * @param apartmentIds - Array of apartment IDs belonging to the team
 * @param callback - Callback function for room changes
 * @returns Unsubscribe function
 */
export function subscribeToTeamRooms(
  teamId: string,
  apartmentIds: string[],
  callback: (payload: RealtimePayload<SupabaseRoom>) => void
): () => Promise<void> {
  // Create a set for fast lookup
  const apartmentIdSet = new Set(apartmentIds);

  // Subscribe to all rooms and filter by apartment IDs
  subscribeToTable<SupabaseRoom>(
    'rooms',
    null, // No filter - we'll filter in callback
    (payload) => {
      // Filter to only include rooms from our team's apartments
      const roomData = payload.new || payload.old;
      if (roomData && apartmentIdSet.has(roomData.apartment_id)) {
        callback(payload);
      }
    }
  );

  return () => unsubscribeFromTable('rooms');
}
