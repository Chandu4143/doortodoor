/**
 * Business Data Service
 * Handles business campaign and business CRUD operations for corporate campaigns
 * Requirements: 8.3, 9.3, 14.1, 14.2, 14.3, 22.1
 */

import { supabase } from './client';
import { 
  subscribeToTable, 
  unsubscribeFromTable, 
  RealtimePayload 
} from './realtimeService';

// Business status type matching database enum
export type BusinessStatus = 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'meeting_scheduled' | 'follow_up';

// Business category type matching database enum
export type BusinessCategory = 'corporate' | 'retail' | 'restaurant' | 'clinic' | 'office' | 'factory' | 'other';

// Business campaign interface matching database schema
export interface SupabaseBusinessCampaign {
  id: string;
  team_id: string;
  name: string;
  area: string | null;
  target_amount: number;
  created_at: string;
  updated_at: string;
}

// Business interface matching database schema
export interface SupabaseBusiness {
  id: string;
  campaign_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: BusinessCategory;
  status: BusinessStatus;
  note: string | null;
  amount_donated: number;
  amount_pledged: number;
  next_follow_up: string | null;
  // Attribution
  collected_by: string | null;
  entered_by: string | null;
  updated_at: string | null;
  created_at: string;
}

// Input for creating a campaign
export interface CreateCampaignInput {
  name: string;
  area?: string;
  target_amount?: number;
}

// Input for updating a campaign
export interface UpdateCampaignInput {
  name?: string;
  area?: string;
  target_amount?: number;
}


// Input for creating a business
export interface CreateBusinessInput {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: BusinessCategory;
  status?: BusinessStatus;
  note?: string;
  amount_donated?: number;
  amount_pledged?: number;
  next_follow_up?: string;
  collected_by?: string;
}

// Input for updating a business
export interface UpdateBusinessInput {
  name?: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category?: BusinessCategory;
  status?: BusinessStatus;
  note?: string | null;
  amount_donated?: number;
  amount_pledged?: number;
  next_follow_up?: string | null;
  collected_by?: string | null;
}

// ============================================
// Campaign Management Functions
// Requirements: 8.3
// ============================================

/**
 * Creates a new business campaign for a team
 * Requirements: 8.3
 */
export async function createCampaign(
  teamId: string,
  input: CreateCampaignInput
): Promise<{ success: boolean; campaign?: SupabaseBusinessCampaign; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Campaign name is required' };
    }

    const { data, error } = await supabase
      .from('business_campaigns')
      .insert({
        team_id: teamId,
        name: input.name.trim(),
        area: input.area?.trim() || null,
        target_amount: input.target_amount || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error.message);
      return { success: false, error: 'Failed to create campaign' };
    }

    return { success: true, campaign: data as SupabaseBusinessCampaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create campaign';
    return { success: false, error: message };
  }
}


/**
 * Gets all business campaigns for a team
 * Requirements: 8.3
 */
export async function getCampaigns(
  teamId: string
): Promise<{ success: boolean; campaigns?: SupabaseBusinessCampaign[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('business_campaigns')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error.message);
      return { success: false, error: 'Failed to fetch campaigns' };
    }

    return { success: true, campaigns: data as SupabaseBusinessCampaign[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
    return { success: false, error: message };
  }
}

/**
 * Gets a single campaign by ID
 */
export async function getCampaign(
  campaignId: string
): Promise<{ success: boolean; campaign?: SupabaseBusinessCampaign; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('business_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Campaign not found' };
      }
      console.error('Error fetching campaign:', error.message);
      return { success: false, error: 'Failed to fetch campaign' };
    }

    return { success: true, campaign: data as SupabaseBusinessCampaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch campaign';
    return { success: false, error: message };
  }
}

/**
 * Updates a business campaign
 * Requirements: 8.3
 */
export async function updateCampaign(
  campaignId: string,
  updates: UpdateCampaignInput
): Promise<{ success: boolean; campaign?: SupabaseBusinessCampaign; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate updates
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { success: false, error: 'Campaign name cannot be empty' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.area !== undefined) {
      updateData.area = updates.area?.trim() || null;
    }
    if (updates.target_amount !== undefined) {
      updateData.target_amount = updates.target_amount;
    }

    const { data, error } = await supabase
      .from('business_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error.message);
      return { success: false, error: 'Failed to update campaign' };
    }

    return { success: true, campaign: data as SupabaseBusinessCampaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update campaign';
    return { success: false, error: message };
  }
}


/**
 * Deletes a business campaign and all its businesses
 * Requirements: 8.3
 */
export async function deleteCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('business_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      console.error('Error deleting campaign:', error.message);
      return { success: false, error: 'Failed to delete campaign' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete campaign';
    return { success: false, error: message };
  }
}

// ============================================
// Business Management Functions
// Requirements: 8.3, 14.1, 14.2, 14.3, 22.1
// ============================================

/**
 * Creates a new business for a campaign with attribution
 * Requirements: 8.3, 14.1, 14.2, 22.1
 * 
 * - Sets entered_by to current user
 * - Uses collected_by from input or defaults to current user
 */
export async function createBusiness(
  campaignId: string,
  input: CreateBusinessInput
): Promise<{ success: boolean; business?: SupabaseBusiness; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Business name is required' };
    }

    const insertData: Record<string, unknown> = {
      campaign_id: campaignId,
      name: input.name.trim(),
      contact_person: input.contact_person?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      category: input.category || 'other',
      status: input.status || 'unvisited',
      note: input.note?.trim() || null,
      amount_donated: input.amount_donated || 0,
      amount_pledged: input.amount_pledged || 0,
      next_follow_up: input.next_follow_up || null,
      // Attribution: entered_by is always current user
      entered_by: user.id,
      // collected_by defaults to current user if not specified
      collected_by: input.collected_by || user.id,
    };

    const { data, error } = await supabase
      .from('businesses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating business:', error.message);
      return { success: false, error: 'Failed to create business' };
    }

    return { success: true, business: data as SupabaseBusiness };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create business';
    return { success: false, error: message };
  }
}


/**
 * Gets all businesses for a campaign
 * Requirements: 8.3
 */
export async function getBusinessesByCampaign(
  campaignId: string
): Promise<{ success: boolean; businesses?: SupabaseBusiness[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses:', error.message);
      return { success: false, error: 'Failed to fetch businesses' };
    }

    return { success: true, businesses: data as SupabaseBusiness[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch businesses';
    return { success: false, error: message };
  }
}

/**
 * Gets a single business by ID
 */
export async function getBusiness(
  businessId: string
): Promise<{ success: boolean; business?: SupabaseBusiness; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Business not found' };
      }
      console.error('Error fetching business:', error.message);
      return { success: false, error: 'Failed to fetch business' };
    }

    return { success: true, business: data as SupabaseBusiness };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch business';
    return { success: false, error: message };
  }
}

/**
 * Updates a business with attribution tracking
 * Requirements: 8.3, 14.1, 14.2, 14.3, 22.1
 * 
 * - Sets entered_by to current user on update
 * - Uses collected_by from input if provided
 */
export async function updateBusiness(
  businessId: string,
  updates: UpdateBusinessInput
): Promise<{ success: boolean; business?: SupabaseBusiness; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate updates
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { success: false, error: 'Business name cannot be empty' };
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      entered_by: user.id, // Always set entered_by to current user
    };

    // Copy over provided fields
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.contact_person !== undefined) {
      updateData.contact_person = updates.contact_person?.trim() || null;
    }
    if (updates.phone !== undefined) {
      updateData.phone = updates.phone?.trim() || null;
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email?.trim() || null;
    }
    if (updates.address !== undefined) {
      updateData.address = updates.address?.trim() || null;
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.note !== undefined) {
      updateData.note = updates.note?.trim() || null;
    }
    if (updates.amount_donated !== undefined) {
      updateData.amount_donated = updates.amount_donated;
    }
    if (updates.amount_pledged !== undefined) {
      updateData.amount_pledged = updates.amount_pledged;
    }
    if (updates.next_follow_up !== undefined) {
      updateData.next_follow_up = updates.next_follow_up;
    }

    // Handle collected_by attribution
    // Requirements: 22.1 - Allow specifying who collected the donation
    if (updates.collected_by !== undefined) {
      updateData.collected_by = updates.collected_by;
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business:', error.message);
      return { success: false, error: 'Failed to update business' };
    }

    return { success: true, business: data as SupabaseBusiness };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update business';
    return { success: false, error: message };
  }
}


/**
 * Deletes a business
 * Requirements: 8.3
 */
export async function deleteBusiness(
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      console.error('Error deleting business:', error.message);
      return { success: false, error: 'Failed to delete business' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete business';
    return { success: false, error: message };
  }
}

/**
 * Gets businesses collected by a specific user
 * Requirements: 22.5, 22.6 - For calculating individual statistics
 * 
 * @param userId - The user ID who collected the donations
 * @param teamId - Optional team ID to filter by
 * @returns Result with businesses or error
 */
export async function getBusinessesByCollector(
  userId: string,
  teamId?: string
): Promise<{ success: boolean; businesses?: SupabaseBusiness[]; error?: string }> {
  try {
    let query = supabase
      .from('businesses')
      .select(`
        *,
        business_campaigns!inner(team_id)
      `)
      .eq('collected_by', userId);

    if (teamId) {
      query = query.eq('business_campaigns.team_id', teamId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses by collector:', error.message);
      return { success: false, error: 'Failed to fetch businesses' };
    }

    return { success: true, businesses: data as SupabaseBusiness[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch businesses';
    return { success: false, error: message };
  }
}

/**
 * Gets businesses with follow-up scheduled
 * 
 * @param campaignId - The campaign ID to filter by
 * @returns Result with businesses that have follow-ups scheduled
 */
export async function getBusinessesWithFollowUp(
  campaignId: string
): Promise<{ success: boolean; businesses?: SupabaseBusiness[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('campaign_id', campaignId)
      .not('next_follow_up', 'is', null)
      .order('next_follow_up', { ascending: true });

    if (error) {
      console.error('Error fetching businesses with follow-up:', error.message);
      return { success: false, error: 'Failed to fetch businesses' };
    }

    return { success: true, businesses: data as SupabaseBusiness[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch businesses';
    return { success: false, error: message };
  }
}

/**
 * Gets businesses by status
 * 
 * @param campaignId - The campaign ID to filter by
 * @param status - The status to filter by
 * @returns Result with businesses matching the status
 */
export async function getBusinessesByStatus(
  campaignId: string,
  status: BusinessStatus
): Promise<{ success: boolean; businesses?: SupabaseBusiness[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses by status:', error.message);
      return { success: false, error: 'Failed to fetch businesses' };
    }

    return { success: true, businesses: data as SupabaseBusiness[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch businesses';
    return { success: false, error: message };
  }
}


// ============================================
// Real-time Subscription Functions
// Requirements: 9.3
// ============================================

/**
 * Subscribes to real-time updates for business campaigns in a team
 * Requirements: 9.3
 * 
 * @param teamId - The team ID to subscribe to
 * @param callback - Callback function for campaign changes
 * @returns Unsubscribe function
 */
export function subscribeToCampaigns(
  teamId: string,
  callback: (payload: RealtimePayload<SupabaseBusinessCampaign>) => void
): () => Promise<void> {
  subscribeToTable<SupabaseBusinessCampaign>(
    'business_campaigns',
    { column: 'team_id', value: teamId },
    callback
  );

  return () => unsubscribeFromTable('business_campaigns', { column: 'team_id', value: teamId });
}

/**
 * Subscribes to real-time updates for businesses in a campaign
 * Requirements: 9.3
 * 
 * @param campaignId - The campaign ID to subscribe to
 * @param callback - Callback function for business changes
 * @returns Unsubscribe function
 */
export function subscribeToBusinesses(
  campaignId: string,
  callback: (payload: RealtimePayload<SupabaseBusiness>) => void
): () => Promise<void> {
  subscribeToTable<SupabaseBusiness>(
    'businesses',
    { column: 'campaign_id', value: campaignId },
    callback
  );

  return () => unsubscribeFromTable('businesses', { column: 'campaign_id', value: campaignId });
}

/**
 * Subscribes to all business updates across all campaigns for a team
 * This requires joining through campaigns table, so we subscribe to all businesses
 * and filter in the callback
 * Requirements: 9.3
 * 
 * @param teamId - The team ID
 * @param campaignIds - Array of campaign IDs belonging to the team
 * @param callback - Callback function for business changes
 * @returns Unsubscribe function
 */
export function subscribeToTeamBusinesses(
  teamId: string,
  campaignIds: string[],
  callback: (payload: RealtimePayload<SupabaseBusiness>) => void
): () => Promise<void> {
  // Create a set for fast lookup
  const campaignIdSet = new Set(campaignIds);

  // Subscribe to all businesses and filter by campaign IDs
  subscribeToTable<SupabaseBusiness>(
    'businesses',
    null, // No filter - we'll filter in callback
    (payload) => {
      // Filter to only include businesses from our team's campaigns
      const businessData = payload.new || payload.old;
      if (businessData && campaignIdSet.has(businessData.campaign_id)) {
        callback(payload);
      }
    }
  );

  return () => unsubscribeFromTable('businesses');
}
