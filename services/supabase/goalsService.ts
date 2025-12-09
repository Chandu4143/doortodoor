/**
 * Goals Service
 * Handles goal settings, streak tracking, and progress calculation for users
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 22.6
 */

import { supabase } from './client';
import { GoalTargets, StreakData, GoalProgress } from '../../types';

// Goal settings interface matching database schema
export interface SupabaseGoalSettings {
  id: string;
  user_id: string;
  daily_presentations: number;
  daily_forms: number;
  daily_supports: number;
  weekly_presentations: number;
  weekly_forms: number;
  weekly_supports: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

// Input for updating goal settings
export interface UpdateGoalSettingsInput {
  daily_presentations?: number;
  daily_forms?: number;
  daily_supports?: number;
  weekly_presentations?: number;
  weekly_forms?: number;
  weekly_supports?: number;
}

// Default goal settings
const DEFAULT_GOAL_SETTINGS = {
  daily_presentations: 20,
  daily_forms: 5,
  daily_supports: 3,
  weekly_presentations: 100,
  weekly_forms: 25,
  weekly_supports: 15,
  current_streak: 0,
  longest_streak: 0,
  last_active_date: null,
};


// ============================================
// Goal Settings Functions
// Requirements: 15.1, 15.2
// ============================================

/**
 * Gets goal settings for a user
 * Creates default settings if none exist
 * Requirements: 15.1, 15.2
 * 
 * @param userId - The user ID to get settings for
 * @returns Result with goal settings or error
 */
export async function getGoalSettings(
  userId: string
): Promise<{ success: boolean; settings?: SupabaseGoalSettings; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First try to get existing settings
    const { data, error } = await supabase
      .from('goal_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no settings found, create default settings
      if (error.code === 'PGRST116') {
        const createResult = await createDefaultGoalSettings(userId);
        return createResult;
      }
      console.error('Error fetching goal settings:', error.message);
      return { success: false, error: 'Failed to fetch goal settings' };
    }

    return { success: true, settings: data as SupabaseGoalSettings };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch goal settings';
    return { success: false, error: message };
  }
}

/**
 * Creates default goal settings for a user
 * Internal helper function
 * 
 * @param userId - The user ID to create settings for
 * @returns Result with created settings or error
 */
async function createDefaultGoalSettings(
  userId: string
): Promise<{ success: boolean; settings?: SupabaseGoalSettings; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('goal_settings')
      .insert({
        user_id: userId,
        ...DEFAULT_GOAL_SETTINGS,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default goal settings:', error.message);
      return { success: false, error: 'Failed to create goal settings' };
    }

    return { success: true, settings: data as SupabaseGoalSettings };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create goal settings';
    return { success: false, error: message };
  }
}

/**
 * Updates goal settings for a user
 * Requirements: 15.1, 15.2
 * 
 * @param userId - The user ID to update settings for
 * @param updates - The settings to update
 * @returns Result with updated settings or error
 */
export async function updateGoalSettings(
  userId: string,
  updates: UpdateGoalSettingsInput
): Promise<{ success: boolean; settings?: SupabaseGoalSettings; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate that user can only update their own settings
    if (user.id !== userId) {
      return { success: false, error: 'Cannot update another user\'s goal settings' };
    }

    // Validate input values (must be non-negative)
    const validationError = validateGoalSettingsInput(updates);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.daily_presentations !== undefined) {
      updateData.daily_presentations = updates.daily_presentations;
    }
    if (updates.daily_forms !== undefined) {
      updateData.daily_forms = updates.daily_forms;
    }
    if (updates.daily_supports !== undefined) {
      updateData.daily_supports = updates.daily_supports;
    }
    if (updates.weekly_presentations !== undefined) {
      updateData.weekly_presentations = updates.weekly_presentations;
    }
    if (updates.weekly_forms !== undefined) {
      updateData.weekly_forms = updates.weekly_forms;
    }
    if (updates.weekly_supports !== undefined) {
      updateData.weekly_supports = updates.weekly_supports;
    }

    const { data, error } = await supabase
      .from('goal_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // If no settings exist, create them first then update
      if (error.code === 'PGRST116') {
        const createResult = await createDefaultGoalSettings(userId);
        if (!createResult.success) {
          return createResult;
        }
        // Retry update
        return updateGoalSettings(userId, updates);
      }
      console.error('Error updating goal settings:', error.message);
      return { success: false, error: 'Failed to update goal settings' };
    }

    return { success: true, settings: data as SupabaseGoalSettings };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update goal settings';
    return { success: false, error: message };
  }
}

/**
 * Validates goal settings input values
 * 
 * @param input - The input to validate
 * @returns Error message if invalid, null if valid
 */
function validateGoalSettingsInput(input: UpdateGoalSettingsInput): string | null {
  if (input.daily_presentations !== undefined && input.daily_presentations < 0) {
    return 'Daily presentations target must be non-negative';
  }
  if (input.daily_forms !== undefined && input.daily_forms < 0) {
    return 'Daily forms target must be non-negative';
  }
  if (input.daily_supports !== undefined && input.daily_supports < 0) {
    return 'Daily supports target must be non-negative';
  }
  if (input.weekly_presentations !== undefined && input.weekly_presentations < 0) {
    return 'Weekly presentations target must be non-negative';
  }
  if (input.weekly_forms !== undefined && input.weekly_forms < 0) {
    return 'Weekly forms target must be non-negative';
  }
  if (input.weekly_supports !== undefined && input.weekly_supports < 0) {
    return 'Weekly supports target must be non-negative';
  }
  return null;
}


// ============================================
// Streak Calculation Functions
// Requirements: 15.3, 15.4
// ============================================

/**
 * Gets today's date as YYYY-MM-DD string
 */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Gets yesterday's date as YYYY-MM-DD string
 */
export function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Calculates the updated streak based on activity
 * Requirements: 15.3, 15.4
 * 
 * Logic:
 * - If user had activity today and last active was yesterday: increment streak
 * - If user had activity today and last active was today: no change (already counted)
 * - If user had activity today and last active was before yesterday: reset to 1
 * - Longest streak is preserved and updated if current exceeds it
 * 
 * @param currentStreak - Current streak count
 * @param longestStreak - Longest streak ever achieved
 * @param lastActiveDate - Last date user was active (YYYY-MM-DD or null)
 * @param hadActivity - Whether user had activity today
 * @returns Updated streak data
 */
export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string | null,
  hadActivity: boolean
): StreakData {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  let newCurrentStreak = currentStreak;
  let newLongestStreak = longestStreak;
  let newLastActiveDate = lastActiveDate || '';

  if (hadActivity) {
    if (lastActiveDate === today) {
      // Already counted today - no change
    } else if (lastActiveDate === yesterday) {
      // Consecutive day - increment streak
      newCurrentStreak = currentStreak + 1;
    } else {
      // Gap in activity - reset streak to 1
      newCurrentStreak = 1;
    }
    newLastActiveDate = today;
    // Update longest streak if current exceeds it
    newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActiveDate: newLastActiveDate,
  };
}

/**
 * Updates the streak for a user in the database
 * Requirements: 15.3, 15.4
 * 
 * @param userId - The user ID to update streak for
 * @param hadActivity - Whether user had activity today (default true)
 * @returns Result with updated streak data or error
 */
export async function updateStreak(
  userId: string,
  hadActivity: boolean = true
): Promise<{ success: boolean; streak?: StreakData; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate that user can only update their own streak
    if (user.id !== userId) {
      return { success: false, error: 'Cannot update another user\'s streak' };
    }

    // Get current settings
    const settingsResult = await getGoalSettings(userId);
    if (!settingsResult.success || !settingsResult.settings) {
      return { success: false, error: settingsResult.error || 'Failed to get goal settings' };
    }

    const settings = settingsResult.settings;

    // Calculate new streak
    const newStreak = calculateStreak(
      settings.current_streak,
      settings.longest_streak,
      settings.last_active_date,
      hadActivity
    );

    // Update in database
    const { data, error } = await supabase
      .from('goal_settings')
      .update({
        current_streak: newStreak.currentStreak,
        longest_streak: newStreak.longestStreak,
        last_active_date: newStreak.lastActiveDate,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating streak:', error.message);
      return { success: false, error: 'Failed to update streak' };
    }

    return { 
      success: true, 
      streak: {
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActiveDate: data.last_active_date || '',
      }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update streak';
    return { success: false, error: message };
  }
}

/**
 * Resets the current streak to zero while preserving longest streak
 * Requirements: 15.4
 * 
 * @param userId - The user ID to reset streak for
 * @returns Result with updated streak data or error
 */
export async function resetStreak(
  userId: string
): Promise<{ success: boolean; streak?: StreakData; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (user.id !== userId) {
      return { success: false, error: 'Cannot reset another user\'s streak' };
    }

    // Get current settings to preserve longest streak
    const settingsResult = await getGoalSettings(userId);
    if (!settingsResult.success || !settingsResult.settings) {
      return { success: false, error: settingsResult.error || 'Failed to get goal settings' };
    }

    const { data, error } = await supabase
      .from('goal_settings')
      .update({
        current_streak: 0,
        // longest_streak is preserved
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error resetting streak:', error.message);
      return { success: false, error: 'Failed to reset streak' };
    }

    return { 
      success: true, 
      streak: {
        currentStreak: 0,
        longestStreak: data.longest_streak,
        lastActiveDate: data.last_active_date || '',
      }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset streak';
    return { success: false, error: message };
  }
}


// ============================================
// Progress Calculation Functions
// Requirements: 15.5, 22.6
// ============================================

/**
 * Progress data for a specific date
 */
export interface DailyProgress {
  date: string;
  presentations: number;
  forms: number;
  supports: number;
  amount: number;
}

/**
 * Gets the start of the week (Monday) for a given date
 * 
 * @param date - The date to get week start for
 * @returns Week start date as YYYY-MM-DD string
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Gets progress for a user within a date range
 * Calculates progress from donations attributed to the user
 * Requirements: 15.5, 22.6
 * 
 * @param userId - The user ID to get progress for
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param teamId - Optional team ID to filter by
 * @returns Result with progress data or error
 */
export async function getProgress(
  userId: string,
  startDate: string,
  endDate: string,
  teamId?: string
): Promise<{ success: boolean; progress?: DailyProgress[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get rooms collected by user within date range
    let roomsQuery = supabase
      .from('rooms')
      .select('amount_donated, supports_count, status, updated_at')
      .eq('collected_by', userId)
      .gte('updated_at', `${startDate}T00:00:00`)
      .lte('updated_at', `${endDate}T23:59:59`);

    // Get businesses collected by user within date range
    let businessesQuery = supabase
      .from('businesses')
      .select('amount_donated, status, updated_at')
      .eq('collected_by', userId)
      .gte('updated_at', `${startDate}T00:00:00`)
      .lte('updated_at', `${endDate}T23:59:59`);

    const [roomsResult, businessesResult] = await Promise.all([
      roomsQuery,
      businessesQuery,
    ]);

    if (roomsResult.error) {
      console.error('Error fetching rooms for progress:', roomsResult.error.message);
      return { success: false, error: 'Failed to fetch progress data' };
    }

    if (businessesResult.error) {
      console.error('Error fetching businesses for progress:', businessesResult.error.message);
      return { success: false, error: 'Failed to fetch progress data' };
    }

    // Aggregate progress by date
    const progressByDate = new Map<string, DailyProgress>();

    // Process rooms
    for (const room of roomsResult.data || []) {
      if (!room.updated_at) continue;
      
      const date = room.updated_at.split('T')[0];
      const existing = progressByDate.get(date) || {
        date,
        presentations: 0,
        forms: 0,
        supports: 0,
        amount: 0,
      };

      // Count as presentation (visit)
      existing.presentations += 1;
      
      // Count as form if donated
      if (room.status === 'donated' && room.amount_donated > 0) {
        existing.forms += 1;
        existing.supports += room.supports_count || 0;
        existing.amount += room.amount_donated || 0;
      }

      progressByDate.set(date, existing);
    }

    // Process businesses
    for (const business of businessesResult.data || []) {
      if (!business.updated_at) continue;
      
      const date = business.updated_at.split('T')[0];
      const existing = progressByDate.get(date) || {
        date,
        presentations: 0,
        forms: 0,
        supports: 0,
        amount: 0,
      };

      // Count as presentation (visit)
      existing.presentations += 1;
      
      // Count as form if donated
      if (business.status === 'donated' && business.amount_donated > 0) {
        existing.forms += 1;
        existing.amount += business.amount_donated || 0;
        // Business donations don't have supports_count, calculate from amount
        existing.supports += Math.floor((business.amount_donated || 0) / 1200);
      }

      progressByDate.set(date, existing);
    }

    // Convert to array and sort by date
    const progress = Array.from(progressByDate.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    return { success: true, progress };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get progress';
    return { success: false, error: message };
  }
}

/**
 * Gets today's progress for a user
 * Requirements: 15.5, 22.6
 * 
 * @param userId - The user ID to get progress for
 * @param teamId - Optional team ID to filter by
 * @returns Result with today's progress or error
 */
export async function getTodayProgress(
  userId: string,
  teamId?: string
): Promise<{ success: boolean; progress?: DailyProgress; error?: string }> {
  const today = getTodayKey();
  const result = await getProgress(userId, today, today, teamId);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Return today's progress or empty progress
  const todayProgress = result.progress?.find(p => p.date === today) || {
    date: today,
    presentations: 0,
    forms: 0,
    supports: 0,
    amount: 0,
  };

  return { success: true, progress: todayProgress };
}

/**
 * Gets this week's aggregated progress for a user
 * Requirements: 15.5, 22.6
 * 
 * @param userId - The user ID to get progress for
 * @param teamId - Optional team ID to filter by
 * @returns Result with week's progress or error
 */
export async function getWeekProgress(
  userId: string,
  teamId?: string
): Promise<{ success: boolean; progress?: DailyProgress; error?: string }> {
  const weekStart = getWeekStart();
  const today = getTodayKey();
  
  const result = await getProgress(userId, weekStart, today, teamId);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Aggregate all days in the week
  const weekProgress = (result.progress || []).reduce(
    (acc, day) => ({
      date: weekStart,
      presentations: acc.presentations + day.presentations,
      forms: acc.forms + day.forms,
      supports: acc.supports + day.supports,
      amount: acc.amount + day.amount,
    }),
    { date: weekStart, presentations: 0, forms: 0, supports: 0, amount: 0 }
  );

  return { success: true, progress: weekProgress };
}

/**
 * Gets total statistics for a user (all time)
 * Requirements: 22.6
 * 
 * @param userId - The user ID to get stats for
 * @param teamId - Optional team ID to filter by
 * @returns Result with total stats or error
 */
export async function getTotalStats(
  userId: string,
  teamId?: string
): Promise<{ 
  success: boolean; 
  stats?: { presentations: number; forms: number; supports: number; amount: number }; 
  error?: string 
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all rooms collected by user
    const roomsQuery = supabase
      .from('rooms')
      .select('amount_donated, supports_count, status')
      .eq('collected_by', userId);

    // Get all businesses collected by user
    const businessesQuery = supabase
      .from('businesses')
      .select('amount_donated, status')
      .eq('collected_by', userId);

    const [roomsResult, businessesResult] = await Promise.all([
      roomsQuery,
      businessesQuery,
    ]);

    if (roomsResult.error) {
      console.error('Error fetching rooms for stats:', roomsResult.error.message);
      return { success: false, error: 'Failed to fetch statistics' };
    }

    if (businessesResult.error) {
      console.error('Error fetching businesses for stats:', businessesResult.error.message);
      return { success: false, error: 'Failed to fetch statistics' };
    }

    let presentations = 0;
    let forms = 0;
    let supports = 0;
    let amount = 0;

    // Process rooms
    for (const room of roomsResult.data || []) {
      presentations += 1;
      if (room.status === 'donated' && room.amount_donated > 0) {
        forms += 1;
        supports += room.supports_count || 0;
        amount += room.amount_donated || 0;
      }
    }

    // Process businesses
    for (const business of businessesResult.data || []) {
      presentations += 1;
      if (business.status === 'donated' && business.amount_donated > 0) {
        forms += 1;
        amount += business.amount_donated || 0;
        supports += Math.floor((business.amount_donated || 0) / 1200);
      }
    }

    return { success: true, stats: { presentations, forms, supports, amount } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get statistics';
    return { success: false, error: message };
  }
}

// ============================================
// Helper Functions for UI Integration
// ============================================

/**
 * Converts Supabase goal settings to the app's GoalTargets format
 * 
 * @param settings - Supabase goal settings
 * @returns Daily and weekly targets
 */
export function toGoalTargets(settings: SupabaseGoalSettings): {
  dailyTargets: GoalTargets;
  weeklyTargets: GoalTargets;
} {
  return {
    dailyTargets: {
      presentations: settings.daily_presentations,
      forms: settings.daily_forms,
      supports: settings.daily_supports,
    },
    weeklyTargets: {
      presentations: settings.weekly_presentations,
      forms: settings.weekly_forms,
      supports: settings.weekly_supports,
    },
  };
}

/**
 * Converts Supabase goal settings to the app's StreakData format
 * 
 * @param settings - Supabase goal settings
 * @returns Streak data
 */
export function toStreakData(settings: SupabaseGoalSettings): StreakData {
  return {
    currentStreak: settings.current_streak,
    longestStreak: settings.longest_streak,
    lastActiveDate: settings.last_active_date || '',
  };
}

/**
 * Converts DailyProgress to the app's GoalProgress format
 * 
 * @param progress - Daily progress data
 * @returns Goal progress in app format
 */
export function toGoalProgress(progress: DailyProgress): GoalProgress {
  return {
    date: progress.date,
    presentations: progress.presentations,
    forms: progress.forms,
    supports: progress.supports,
    amount: progress.amount,
  };
}
