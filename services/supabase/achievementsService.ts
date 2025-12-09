/**
 * Achievements Service
 * Handles achievement checking, unlocking, and retrieval for users
 * Requirements: 16.1, 16.5
 */

import { supabase } from './client';
import { getTotalStats, getGoalSettings } from './goalsService';
import { 
  ACHIEVEMENTS, 
  AchievementDefinition, 
  getAchievementById,
  toAchievement 
} from '../../constants/achievements';
import { Achievement } from '../../types';

/**
 * User achievement record from database
 */
export interface UserAchievementRecord {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

/**
 * User statistics for achievement checking
 */
export interface UserStats {
  presentations: number;
  forms: number;
  supports: number;
  amount: number;
  currentStreak: number;
  longestStreak: number;
}

// ============================================
// Achievement Retrieval Functions
// Requirements: 16.2
// ============================================

/**
 * Gets all achievements for a user with unlock status
 * Requirements: 16.2
 * 
 * @param userId - The user ID to get achievements for
 * @returns Result with achievements array or error
 */
export async function getAchievements(
  userId: string
): Promise<{ success: boolean; achievements?: Achievement[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's unlocked achievements from database
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching achievements:', error.message);
      return { success: false, error: 'Failed to fetch achievements' };
    }

    // Create map of unlocked achievements
    const unlockedMap = new Map<string, number>();
    for (const record of data || []) {
      unlockedMap.set(
        record.achievement_id, 
        new Date(record.unlocked_at).getTime()
      );
    }

    // Convert all achievement definitions to Achievement type with unlock status
    const achievements = ACHIEVEMENTS.map(def => 
      toAchievement(def, unlockedMap.get(def.id))
    );

    return { success: true, achievements };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch achievements';
    return { success: false, error: message };
  }
}

/**
 * Gets only unlocked achievements for a user
 * Requirements: 16.4
 * 
 * @param userId - The user ID to get achievements for
 * @returns Result with unlocked achievements array or error
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<{ success: boolean; achievements?: Achievement[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching unlocked achievements:', error.message);
      return { success: false, error: 'Failed to fetch achievements' };
    }

    // Convert to Achievement type
    const achievements: Achievement[] = [];
    for (const record of data || []) {
      const def = getAchievementById(record.achievement_id);
      if (def) {
        achievements.push(toAchievement(def, new Date(record.unlocked_at).getTime()));
      }
    }

    return { success: true, achievements };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch achievements';
    return { success: false, error: message };
  }
}

// ============================================
// Achievement Unlock Functions
// Requirements: 16.1, 16.5
// ============================================

/**
 * Unlocks an achievement for a user
 * Requirements: 16.1
 * 
 * @param userId - The user ID to unlock achievement for
 * @param achievementId - The achievement ID to unlock
 * @returns Result with success status or error
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<{ success: boolean; achievement?: Achievement; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate that user can only unlock their own achievements
    if (user.id !== userId) {
      return { success: false, error: 'Cannot unlock achievements for another user' };
    }

    // Validate achievement exists
    const achievementDef = getAchievementById(achievementId);
    if (!achievementDef) {
      return { success: false, error: 'Achievement not found' };
    }

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (existing) {
      // Already unlocked - return success with existing data
      return { 
        success: true, 
        achievement: toAchievement(achievementDef, Date.now())
      };
    }

    // Insert new achievement unlock
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (already unlocked)
      if (error.code === '23505') {
        return { 
          success: true, 
          achievement: toAchievement(achievementDef, Date.now())
        };
      }
      console.error('Error unlocking achievement:', error.message);
      return { success: false, error: 'Failed to unlock achievement' };
    }

    return { 
      success: true, 
      achievement: toAchievement(achievementDef, new Date(data.unlocked_at).getTime())
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unlock achievement';
    return { success: false, error: message };
  }
}

// ============================================
// Achievement Checking Functions
// Requirements: 16.1, 16.5
// ============================================

/**
 * Checks if an achievement should be unlocked based on user stats
 * Pure function for testability
 * Requirements: 16.5
 * 
 * @param achievement - Achievement definition to check
 * @param stats - User's current statistics
 * @returns True if achievement requirement is met
 */
export function isAchievementEarned(
  achievement: AchievementDefinition,
  stats: UserStats
): boolean {
  const { type, value } = achievement.requirement;
  
  switch (type) {
    case 'presentations':
      return stats.presentations >= value;
    case 'forms':
      return stats.forms >= value;
    case 'supports':
      return stats.supports >= value;
    case 'amount':
      return stats.amount >= value;
    case 'streak':
      // Check both current and longest streak
      return stats.currentStreak >= value || stats.longestStreak >= value;
    default:
      return false;
  }
}

/**
 * Gets user statistics for achievement checking
 * Requirements: 16.5
 * 
 * @param userId - The user ID to get stats for
 * @returns Result with user stats or error
 */
export async function getUserStatsForAchievements(
  userId: string
): Promise<{ success: boolean; stats?: UserStats; error?: string }> {
  try {
    // Get total stats (presentations, forms, supports, amount)
    const statsResult = await getTotalStats(userId);
    if (!statsResult.success || !statsResult.stats) {
      return { success: false, error: statsResult.error || 'Failed to get stats' };
    }

    // Get streak data
    const settingsResult = await getGoalSettings(userId);
    if (!settingsResult.success || !settingsResult.settings) {
      return { success: false, error: settingsResult.error || 'Failed to get settings' };
    }

    const stats: UserStats = {
      presentations: statsResult.stats.presentations,
      forms: statsResult.stats.forms,
      supports: statsResult.stats.supports,
      amount: statsResult.stats.amount,
      currentStreak: settingsResult.settings.current_streak,
      longestStreak: settingsResult.settings.longest_streak,
    };

    return { success: true, stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get user stats';
    return { success: false, error: message };
  }
}

/**
 * Checks all achievements for a user and unlocks any newly earned ones
 * Requirements: 16.1, 16.5
 * 
 * @param userId - The user ID to check achievements for
 * @returns Result with newly unlocked achievements or error
 */
export async function checkAchievements(
  userId: string
): Promise<{ success: boolean; newlyUnlocked?: Achievement[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate that user can only check their own achievements
    if (user.id !== userId) {
      return { success: false, error: 'Cannot check achievements for another user' };
    }

    // Get user's current stats
    const statsResult = await getUserStatsForAchievements(userId);
    if (!statsResult.success || !statsResult.stats) {
      return { success: false, error: statsResult.error || 'Failed to get user stats' };
    }

    // Get already unlocked achievements
    const { data: unlockedData, error: unlockedError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (unlockedError) {
      console.error('Error fetching unlocked achievements:', unlockedError.message);
      return { success: false, error: 'Failed to check achievements' };
    }

    const unlockedIds = new Set((unlockedData || []).map(r => r.achievement_id));

    // Check each achievement
    const newlyUnlocked: Achievement[] = [];
    
    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) {
        continue;
      }

      // Check if earned
      if (isAchievementEarned(achievement, statsResult.stats)) {
        // Unlock the achievement
        const unlockResult = await unlockAchievement(userId, achievement.id);
        if (unlockResult.success && unlockResult.achievement) {
          newlyUnlocked.push(unlockResult.achievement);
        }
      }
    }

    return { success: true, newlyUnlocked };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check achievements';
    return { success: false, error: message };
  }
}

/**
 * Gets achievement progress for a user
 * Shows how close they are to each locked achievement
 * 
 * @param userId - The user ID to get progress for
 * @returns Result with achievement progress or error
 */
export async function getAchievementProgress(
  userId: string
): Promise<{ 
  success: boolean; 
  progress?: Array<{ achievement: Achievement; current: number; percentage: number }>; 
  error?: string 
}> {
  try {
    // Get user stats
    const statsResult = await getUserStatsForAchievements(userId);
    if (!statsResult.success || !statsResult.stats) {
      return { success: false, error: statsResult.error || 'Failed to get stats' };
    }

    // Get achievements with unlock status
    const achievementsResult = await getAchievements(userId);
    if (!achievementsResult.success || !achievementsResult.achievements) {
      return { success: false, error: achievementsResult.error || 'Failed to get achievements' };
    }

    const stats = statsResult.stats;
    const progress = achievementsResult.achievements.map(achievement => {
      const def = getAchievementById(achievement.id);
      if (!def) {
        return { achievement, current: 0, percentage: 0 };
      }

      let current = 0;
      switch (def.requirement.type) {
        case 'presentations':
          current = stats.presentations;
          break;
        case 'forms':
          current = stats.forms;
          break;
        case 'supports':
          current = stats.supports;
          break;
        case 'amount':
          current = stats.amount;
          break;
        case 'streak':
          current = Math.max(stats.currentStreak, stats.longestStreak);
          break;
      }

      const percentage = Math.min(100, Math.floor((current / def.requirement.value) * 100));

      return { achievement, current, percentage };
    });

    return { success: true, progress };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get achievement progress';
    return { success: false, error: message };
  }
}
