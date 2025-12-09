/**
 * Statistics Service
 * Handles team and individual statistics aggregation
 * Requirements: 11.3, 11.4, 20.3
 */

import { supabase } from './client';
import { getCurrentUserRole } from './profileService';

// Individual member statistics
export interface MemberStatistics {
  userId: string;
  userName: string;
  // Residential stats
  residentialVisits: number;
  residentialDonations: number;
  residentialAmount: number;
  residentialSupports: number;
  // Business stats
  businessVisits: number;
  businessDonations: number;
  businessAmount: number;
  businessPledged: number;
  // Combined totals
  totalVisits: number;
  totalDonations: number;
  totalAmount: number;
  conversionRate: number; // donations / visits as percentage
}

// Team-level statistics
export interface TeamStatistics {
  teamId: string;
  teamName: string;
  // Residential stats
  totalResidentialVisits: number;
  totalResidentialDonations: number;
  totalResidentialAmount: number;
  totalResidentialSupports: number;
  // Business stats
  totalBusinessVisits: number;
  totalBusinessDonations: number;
  totalBusinessAmount: number;
  totalBusinessPledged: number;
  // Combined totals
  totalVisits: number;
  totalDonations: number;
  totalAmount: number;
  conversionRate: number;
  // Member breakdown
  memberStats: MemberStatistics[];
}

// Team ranking entry
export interface TeamRanking {
  teamId: string;
  teamName: string;
  totalAmount: number;
  totalDonations: number;
  totalVisits: number;
  conversionRate: number;
  rank: number;
}

// Date range filter
export interface DateRangeFilter {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
}


/**
 * Gets individual statistics for a specific user
 * Requirements: 20.3, 22.5, 22.6 - Statistics attributed to collecting member
 * 
 * @param userId - The user ID to get statistics for
 * @param teamId - Optional team ID to filter by
 * @param dateRange - Optional date range filter
 * @returns Individual statistics for the user
 */
export async function getIndividualStatistics(
  userId: string,
  teamId?: string,
  dateRange?: DateRangeFilter
): Promise<{ success: boolean; statistics?: MemberStatistics; error?: string }> {
  try {
    // Get user profile for name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError.message);
      return { success: false, error: 'Failed to fetch user profile' };
    }

    // Build residential rooms query - attributed to this user as collector
    let roomsQuery = supabase
      .from('rooms')
      .select(`
        id,
        status,
        amount_donated,
        supports_count,
        updated_at,
        apartments!inner(team_id)
      `)
      .eq('collected_by', userId);

    if (teamId) {
      roomsQuery = roomsQuery.eq('apartments.team_id', teamId);
    }

    if (dateRange) {
      roomsQuery = roomsQuery
        .gte('updated_at', dateRange.startDate)
        .lte('updated_at', dateRange.endDate);
    }

    const { data: rooms, error: roomsError } = await roomsQuery;

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError.message);
      return { success: false, error: 'Failed to fetch residential statistics' };
    }

    // Build business query - attributed to this user as collector
    let businessQuery = supabase
      .from('businesses')
      .select(`
        id,
        status,
        amount_donated,
        amount_pledged,
        updated_at,
        business_campaigns!inner(team_id)
      `)
      .eq('collected_by', userId);

    if (teamId) {
      businessQuery = businessQuery.eq('business_campaigns.team_id', teamId);
    }

    if (dateRange) {
      businessQuery = businessQuery
        .gte('updated_at', dateRange.startDate)
        .lte('updated_at', dateRange.endDate);
    }

    const { data: businesses, error: businessError } = await businessQuery;

    if (businessError) {
      console.error('Error fetching businesses:', businessError.message);
      return { success: false, error: 'Failed to fetch business statistics' };
    }

    // Calculate residential statistics
    const residentialVisits = rooms?.filter(r => r.status !== 'unvisited').length || 0;
    const residentialDonations = rooms?.filter(r => r.status === 'donated').length || 0;
    const residentialAmount = rooms?.reduce((sum, r) => sum + (r.amount_donated || 0), 0) || 0;
    const residentialSupports = rooms?.reduce((sum, r) => sum + (r.supports_count || 0), 0) || 0;

    // Calculate business statistics
    const businessVisits = businesses?.filter(b => b.status !== 'unvisited').length || 0;
    const businessDonations = businesses?.filter(b => b.status === 'donated').length || 0;
    const businessAmount = businesses?.reduce((sum, b) => sum + (b.amount_donated || 0), 0) || 0;
    const businessPledged = businesses?.reduce((sum, b) => sum + (b.amount_pledged || 0), 0) || 0;

    // Calculate combined totals
    const totalVisits = residentialVisits + businessVisits;
    const totalDonations = residentialDonations + businessDonations;
    const totalAmount = residentialAmount + businessAmount;
    const conversionRate = totalVisits > 0 ? (totalDonations / totalVisits) * 100 : 0;

    const statistics: MemberStatistics = {
      userId,
      userName: profile?.name || 'Unknown',
      residentialVisits,
      residentialDonations,
      residentialAmount,
      residentialSupports,
      businessVisits,
      businessDonations,
      businessAmount,
      businessPledged,
      totalVisits,
      totalDonations,
      totalAmount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };

    return { success: true, statistics };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch individual statistics';
    return { success: false, error: message };
  }
}


/**
 * Gets aggregated statistics for a team including member breakdown
 * Requirements: 11.3, 20.3
 * 
 * @param teamId - The team ID to get statistics for
 * @param dateRange - Optional date range filter
 * @returns Team statistics with member breakdown
 */
export async function getTeamStatistics(
  teamId: string,
  dateRange?: DateRangeFilter
): Promise<{ success: boolean; statistics?: TeamStatistics; error?: string }> {
  try {
    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError.message);
      return { success: false, error: 'Failed to fetch team' };
    }

    // Get team members
    const { data: memberships, error: memberError } = await supabase
      .from('team_memberships')
      .select(`
        user_id,
        profiles (
          id,
          name
        )
      `)
      .eq('team_id', teamId);

    if (memberError) {
      console.error('Error fetching team members:', memberError.message);
      return { success: false, error: 'Failed to fetch team members' };
    }

    // Get statistics for each member
    const memberStats: MemberStatistics[] = [];
    
    for (const membership of memberships || []) {
      const result = await getIndividualStatistics(
        membership.user_id,
        teamId,
        dateRange
      );
      
      if (result.success && result.statistics) {
        memberStats.push(result.statistics);
      }
    }

    // Aggregate team totals from member stats
    const totalResidentialVisits = memberStats.reduce((sum, m) => sum + m.residentialVisits, 0);
    const totalResidentialDonations = memberStats.reduce((sum, m) => sum + m.residentialDonations, 0);
    const totalResidentialAmount = memberStats.reduce((sum, m) => sum + m.residentialAmount, 0);
    const totalResidentialSupports = memberStats.reduce((sum, m) => sum + m.residentialSupports, 0);
    
    const totalBusinessVisits = memberStats.reduce((sum, m) => sum + m.businessVisits, 0);
    const totalBusinessDonations = memberStats.reduce((sum, m) => sum + m.businessDonations, 0);
    const totalBusinessAmount = memberStats.reduce((sum, m) => sum + m.businessAmount, 0);
    const totalBusinessPledged = memberStats.reduce((sum, m) => sum + m.businessPledged, 0);

    const totalVisits = totalResidentialVisits + totalBusinessVisits;
    const totalDonations = totalResidentialDonations + totalBusinessDonations;
    const totalAmount = totalResidentialAmount + totalBusinessAmount;
    const conversionRate = totalVisits > 0 ? (totalDonations / totalVisits) * 100 : 0;

    const statistics: TeamStatistics = {
      teamId,
      teamName: team?.name || 'Unknown',
      totalResidentialVisits,
      totalResidentialDonations,
      totalResidentialAmount,
      totalResidentialSupports,
      totalBusinessVisits,
      totalBusinessDonations,
      totalBusinessAmount,
      totalBusinessPledged,
      totalVisits,
      totalDonations,
      totalAmount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      memberStats,
    };

    return { success: true, statistics };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team statistics';
    return { success: false, error: message };
  }
}


/**
 * Filters statistics by date range
 * Requirements: 11.4
 * 
 * This is a utility function that creates a date range filter object
 * 
 * @param startDate - Start date (ISO string or Date)
 * @param endDate - End date (ISO string or Date)
 * @returns DateRangeFilter object
 */
export function filterByDateRange(
  startDate: string | Date,
  endDate: string | Date
): DateRangeFilter {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  return {
    startDate: start,
    endDate: end,
  };
}

/**
 * Gets team rankings across all teams (for Owner/BDM view)
 * Requirements: 11.4
 * 
 * @param dateRange - Optional date range filter
 * @returns Array of team rankings sorted by total amount
 */
export async function getTeamRankings(
  dateRange?: DateRangeFilter
): Promise<{ success: boolean; rankings?: TeamRanking[]; error?: string }> {
  try {
    // Check user role - only Owner and BDM can see all team rankings
    const userRole = await getCurrentUserRole();
    
    if (!userRole || !['dev', 'owner', 'bdm'].includes(userRole)) {
      return { 
        success: false, 
        error: 'You do not have permission to view team rankings' 
      };
    }

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError.message);
      return { success: false, error: 'Failed to fetch teams' };
    }

    // Get statistics for each team
    const rankings: TeamRanking[] = [];
    
    for (const team of teams || []) {
      const result = await getTeamStatistics(team.id, dateRange);
      
      if (result.success && result.statistics) {
        rankings.push({
          teamId: team.id,
          teamName: team.name,
          totalAmount: result.statistics.totalAmount,
          totalDonations: result.statistics.totalDonations,
          totalVisits: result.statistics.totalVisits,
          conversionRate: result.statistics.conversionRate,
          rank: 0, // Will be set after sorting
        });
      }
    }

    // Sort by total amount (descending) and assign ranks
    rankings.sort((a, b) => b.totalAmount - a.totalAmount);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return { success: true, rankings };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team rankings';
    return { success: false, error: message };
  }
}

/**
 * Gets statistics for all teams the current user has access to
 * For Team Members/Leaders: returns stats for their teams only
 * For BDM/Owner: returns stats for all teams
 * Requirements: 11.3
 * 
 * @param dateRange - Optional date range filter
 * @returns Array of team statistics
 */
export async function getAccessibleTeamStatistics(
  dateRange?: DateRangeFilter
): Promise<{ success: boolean; statistics?: TeamStatistics[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userRole = await getCurrentUserRole();
    const isAdmin = userRole && ['dev', 'owner', 'bdm'].includes(userRole);

    let teams: { id: string; name: string }[] = [];

    if (isAdmin) {
      // Admin can see all teams
      const { data, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) {
        console.error('Error fetching teams:', error.message);
        return { success: false, error: 'Failed to fetch teams' };
      }
      teams = data || [];
    } else {
      // Regular users can only see their teams
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          teams (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user teams:', error.message);
        return { success: false, error: 'Failed to fetch teams' };
      }
      
      teams = (data || [])
        .filter(item => item.teams)
        .map(item => item.teams as unknown as { id: string; name: string });
    }

    // Get statistics for each team
    const statistics: TeamStatistics[] = [];
    
    for (const team of teams) {
      const result = await getTeamStatistics(team.id, dateRange);
      
      if (result.success && result.statistics) {
        statistics.push(result.statistics);
      }
    }

    return { success: true, statistics };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch team statistics';
    return { success: false, error: message };
  }
}

/**
 * Gets member rankings within a team
 * Requirements: 11.3, 20.3
 * 
 * @param teamId - The team ID to get rankings for
 * @param dateRange - Optional date range filter
 * @returns Array of member statistics sorted by total amount
 */
export async function getTeamMemberRankings(
  teamId: string,
  dateRange?: DateRangeFilter
): Promise<{ success: boolean; rankings?: MemberStatistics[]; error?: string }> {
  try {
    const result = await getTeamStatistics(teamId, dateRange);
    
    if (!result.success || !result.statistics) {
      return { success: false, error: result.error || 'Failed to fetch team statistics' };
    }

    // Sort members by total amount (descending)
    const rankings = [...result.statistics.memberStats].sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return { success: true, rankings };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch member rankings';
    return { success: false, error: message };
  }
}
