/**
 * Migration Service
 * Handles migration of localStorage data to Supabase backend
 * Requirements: 12.1, 12.2, 12.3
 */

import { supabase } from './client';
import { LS_KEY, LS_KEY_CORPORATE } from '../../constants';
import type { Apartment, BusinessCampaign } from '../../types';

// Migration result interface
export interface MigrationResult {
  success: boolean;
  error?: string;
  migratedApartments?: number;
  migratedRooms?: number;
  migratedCampaigns?: number;
  migratedBusinesses?: number;
}

// Local storage data structure
export interface LocalStorageData {
  apartments: Apartment[];
  campaigns: BusinessCampaign[];
  hasResidentialData: boolean;
  hasCorporateData: boolean;
}

/**
 * Checks for existing localStorage data
 * Requirements: 12.1
 * 
 * @returns Object containing localStorage data and flags indicating what data exists
 */
export function checkLocalStorageData(): LocalStorageData {
  let apartments: Apartment[] = [];
  let campaigns: BusinessCampaign[] = [];

  try {
    const residentialRaw = localStorage.getItem(LS_KEY);
    if (residentialRaw) {
      apartments = JSON.parse(residentialRaw);
    }
  } catch (e) {
    console.error('Failed to parse residential localStorage data:', e);
  }

  try {
    const corporateRaw = localStorage.getItem(LS_KEY_CORPORATE);
    if (corporateRaw) {
      campaigns = JSON.parse(corporateRaw);
    }
  } catch (e) {
    console.error('Failed to parse corporate localStorage data:', e);
  }

  return {
    apartments,
    campaigns,
    hasResidentialData: apartments.length > 0,
    hasCorporateData: campaigns.length > 0,
  };
}


/**
 * Checks if user has any data to migrate
 * Requirements: 12.1
 * 
 * @returns True if there is localStorage data to migrate
 */
export function hasDataToMigrate(): boolean {
  const data = checkLocalStorageData();
  return data.hasResidentialData || data.hasCorporateData;
}

/**
 * Converts localStorage room status to Supabase enum
 */
function mapRoomStatus(status: string): 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'other' {
  const validStatuses = ['unvisited', 'donated', 'not_interested', 'callback', 'other'];
  return validStatuses.includes(status) ? status as any : 'unvisited';
}

/**
 * Converts localStorage payment mode to Supabase enum
 */
function mapPaymentMode(mode?: string): 'cash' | 'upi' | 'card' | 'cheque' | 'online' | null {
  if (!mode) return null;
  const validModes = ['cash', 'upi', 'card', 'cheque', 'online'];
  return validModes.includes(mode) ? mode as any : null;
}

/**
 * Converts localStorage business status to Supabase enum
 */
function mapBusinessStatus(status: string): 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'meeting_scheduled' | 'follow_up' {
  const validStatuses = ['unvisited', 'donated', 'not_interested', 'callback', 'meeting_scheduled', 'follow_up'];
  return validStatuses.includes(status) ? status as any : 'unvisited';
}

/**
 * Converts localStorage business category to Supabase enum
 */
function mapBusinessCategory(category: string): 'corporate' | 'retail' | 'restaurant' | 'clinic' | 'office' | 'factory' | 'other' {
  const validCategories = ['corporate', 'retail', 'restaurant', 'clinic', 'office', 'factory', 'other'];
  return validCategories.includes(category) ? category as any : 'other';
}

/**
 * Converts timestamp (number or null) to ISO string or null
 * Requirements: 12.3 - Preserve original timestamps
 */
function timestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}


/**
 * Migrates residential data (apartments and rooms) to Supabase
 * Requirements: 12.2, 12.3
 * 
 * @param teamId - The team ID to migrate data to
 * @param apartments - Array of apartments from localStorage
 * @returns Migration result with counts
 */
async function migrateResidentialData(
  teamId: string,
  apartments: Apartment[]
): Promise<{ success: boolean; apartmentCount: number; roomCount: number; error?: string }> {
  let apartmentCount = 0;
  let roomCount = 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, apartmentCount: 0, roomCount: 0, error: 'Not authenticated' };
    }

    for (const apt of apartments) {
      // Create apartment in Supabase
      // Requirements: 12.3 - Preserve original timestamps
      const { data: newApartment, error: aptError } = await supabase
        .from('apartments')
        .insert({
          team_id: teamId,
          name: apt.name,
          floors: apt.floors,
          units_per_floor: apt.unitsPerFloor,
          target_amount: apt.targetAmount || 0,
          created_at: apt.createdAt ? new Date(apt.createdAt).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();

      if (aptError) {
        console.error('Error migrating apartment:', aptError.message);
        continue;
      }

      apartmentCount++;

      // Migrate rooms for this apartment
      const roomsToInsert: Array<Record<string, unknown>> = [];

      // Iterate through all floors and rooms
      for (const [floorStr, rooms] of Object.entries(apt.rooms)) {
        const floor = parseInt(floorStr, 10);
        
        for (const room of rooms) {
          roomsToInsert.push({
            apartment_id: newApartment.id,
            floor: floor,
            room_number: room.roomNumber,
            status: mapRoomStatus(room.status),
            visitor_name: room.visitorName || null,
            remark: room.remark || null,
            note: room.note || null,
            donor_phone: room.donorPhone || null,
            donor_email: room.donorEmail || null,
            donor_address: room.donorAddress || null,
            donor_pan: room.donorPAN || null,
            amount_donated: room.amountDonated || 0,
            supports_count: room.supportsCount || 0,
            payment_mode: mapPaymentMode(room.paymentMode),
            receipt_number: room.receiptNumber || null,
            // Attribution: set entered_by to current user for migrated data
            entered_by: user.id,
            collected_by: user.id, // Default to current user for migrated data
            updated_at: timestampToISO(room.updatedAt),
            created_at: timestampToISO(room.updatedAt) || new Date().toISOString(),
          });
        }
      }

      // Batch insert rooms
      if (roomsToInsert.length > 0) {
        const { error: roomsError } = await supabase
          .from('rooms')
          .insert(roomsToInsert);

        if (roomsError) {
          console.error('Error migrating rooms:', roomsError.message);
        } else {
          roomCount += roomsToInsert.length;
        }
      }
    }

    return { success: true, apartmentCount, roomCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to migrate residential data';
    return { success: false, apartmentCount, roomCount, error: message };
  }
}


/**
 * Migrates corporate data (campaigns and businesses) to Supabase
 * Requirements: 12.2, 12.3
 * 
 * @param teamId - The team ID to migrate data to
 * @param campaigns - Array of business campaigns from localStorage
 * @returns Migration result with counts
 */
async function migrateCorporateData(
  teamId: string,
  campaigns: BusinessCampaign[]
): Promise<{ success: boolean; campaignCount: number; businessCount: number; error?: string }> {
  let campaignCount = 0;
  let businessCount = 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, campaignCount: 0, businessCount: 0, error: 'Not authenticated' };
    }

    for (const campaign of campaigns) {
      // Create campaign in Supabase
      // Requirements: 12.3 - Preserve original timestamps
      const { data: newCampaign, error: campaignError } = await supabase
        .from('business_campaigns')
        .insert({
          team_id: teamId,
          name: campaign.name,
          area: campaign.area || null,
          target_amount: campaign.targetAmount || 0,
          created_at: campaign.createdAt ? new Date(campaign.createdAt).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Error migrating campaign:', campaignError.message);
        continue;
      }

      campaignCount++;

      // Migrate businesses for this campaign
      const businessesToInsert: Array<Record<string, unknown>> = [];

      for (const biz of campaign.businesses) {
        businessesToInsert.push({
          campaign_id: newCampaign.id,
          name: biz.name,
          contact_person: biz.contactPerson || null,
          phone: biz.phone || null,
          email: biz.email || null,
          address: biz.address || null,
          category: mapBusinessCategory(biz.category),
          status: mapBusinessStatus(biz.status),
          note: biz.note || null,
          amount_donated: biz.amountDonated || 0,
          amount_pledged: biz.amountPledged || 0,
          next_follow_up: timestampToISO(biz.nextFollowUp),
          // Attribution: set entered_by to current user for migrated data
          entered_by: user.id,
          collected_by: user.id, // Default to current user for migrated data
          updated_at: timestampToISO(biz.updatedAt),
          created_at: timestampToISO(biz.updatedAt) || new Date().toISOString(),
        });
      }

      // Batch insert businesses
      if (businessesToInsert.length > 0) {
        const { error: bizError } = await supabase
          .from('businesses')
          .insert(businessesToInsert);

        if (bizError) {
          console.error('Error migrating businesses:', bizError.message);
        } else {
          businessCount += businessesToInsert.length;
        }
      }
    }

    return { success: true, campaignCount, businessCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to migrate corporate data';
    return { success: false, campaignCount, businessCount, error: message };
  }
}


/**
 * Migrates all localStorage data to Supabase
 * Requirements: 12.2, 12.3
 * 
 * @param teamId - The team ID to migrate data to
 * @returns Migration result with success status and counts
 */
export async function migrateToSupabase(teamId: string): Promise<MigrationResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check for localStorage data
    const localData = checkLocalStorageData();
    
    if (!localData.hasResidentialData && !localData.hasCorporateData) {
      return { 
        success: true, 
        migratedApartments: 0,
        migratedRooms: 0,
        migratedCampaigns: 0,
        migratedBusinesses: 0,
      };
    }

    let totalApartments = 0;
    let totalRooms = 0;
    let totalCampaigns = 0;
    let totalBusinesses = 0;
    const errors: string[] = [];

    // Migrate residential data
    if (localData.hasResidentialData) {
      const residentialResult = await migrateResidentialData(teamId, localData.apartments);
      totalApartments = residentialResult.apartmentCount;
      totalRooms = residentialResult.roomCount;
      if (!residentialResult.success && residentialResult.error) {
        errors.push(residentialResult.error);
      }
    }

    // Migrate corporate data
    if (localData.hasCorporateData) {
      const corporateResult = await migrateCorporateData(teamId, localData.campaigns);
      totalCampaigns = corporateResult.campaignCount;
      totalBusinesses = corporateResult.businessCount;
      if (!corporateResult.success && corporateResult.error) {
        errors.push(corporateResult.error);
      }
    }

    // Determine overall success
    const hasErrors = errors.length > 0;
    const hasMigratedData = totalApartments > 0 || totalCampaigns > 0;

    return {
      success: !hasErrors || hasMigratedData,
      error: hasErrors ? errors.join('; ') : undefined,
      migratedApartments: totalApartments,
      migratedRooms: totalRooms,
      migratedCampaigns: totalCampaigns,
      migratedBusinesses: totalBusinesses,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Migration failed';
    return { success: false, error: message };
  }
}

/**
 * Clears localStorage data after successful migration
 * Requirements: 12.4
 */
export function clearLocalStorageData(): void {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_KEY_CORPORATE);
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
}

/**
 * Gets a summary of data to be migrated
 * Useful for showing the user what will be migrated
 */
export function getMigrationSummary(): {
  apartmentCount: number;
  roomCount: number;
  campaignCount: number;
  businessCount: number;
} {
  const data = checkLocalStorageData();
  
  let roomCount = 0;
  for (const apt of data.apartments) {
    for (const rooms of Object.values(apt.rooms)) {
      roomCount += rooms.length;
    }
  }

  let businessCount = 0;
  for (const campaign of data.campaigns) {
    businessCount += campaign.businesses.length;
  }

  return {
    apartmentCount: data.apartments.length,
    roomCount,
    campaignCount: data.campaigns.length,
    businessCount,
  };
}
