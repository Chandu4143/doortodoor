/**
 * Achievement Definitions
 * Defines all achievement milestones for the Door-to-Door fundraising application
 * Requirements: 16.2
 */

import { Achievement } from '../types';

/**
 * Achievement type categories
 */
export type AchievementType = 'presentations' | 'forms' | 'supports' | 'amount' | 'streak';

/**
 * Achievement definition with all metadata
 */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: {
    type: AchievementType;
    value: number;
  };
}

/**
 * All available achievements in the system
 * Requirements: 16.2
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Presentation/Visit Achievements
  {
    id: 'first_visit',
    title: 'First Steps',
    description: 'Complete your first door visit',
    icon: '🚪',
    requirement: { type: 'presentations', value: 1 },
  },
  {
    id: 'visits_10',
    title: 'Getting Started',
    description: 'Complete 10 door visits',
    icon: '👣',
    requirement: { type: 'presentations', value: 10 },
  },
  {
    id: 'visits_50',
    title: 'Door Knocker',
    description: 'Complete 50 door visits',
    icon: '🔔',
    requirement: { type: 'presentations', value: 50 },
  },
  {
    id: 'visits_100',
    title: 'Century Club',
    description: 'Complete 100 door visits',
    icon: '💯',
    requirement: { type: 'presentations', value: 100 },
  },
  {
    id: 'visits_500',
    title: 'Neighborhood Hero',
    description: 'Complete 500 door visits',
    icon: '🏆',
    requirement: { type: 'presentations', value: 500 },
  },
  {
    id: 'visits_1000',
    title: 'Community Champion',
    description: 'Complete 1000 door visits',
    icon: '👑',
    requirement: { type: 'presentations', value: 1000 },
  },

  // Form/Donation Achievements
  {
    id: 'first_form',
    title: 'First Donation',
    description: 'Collect your first donation form',
    icon: '📝',
    requirement: { type: 'forms', value: 1 },
  },
  {
    id: 'forms_10',
    title: 'Form Collector',
    description: 'Collect 10 donation forms',
    icon: '📋',
    requirement: { type: 'forms', value: 10 },
  },
  {
    id: 'forms_25',
    title: 'Donation Pro',
    description: 'Collect 25 donation forms',
    icon: '📑',
    requirement: { type: 'forms', value: 25 },
  },
  {
    id: 'forms_50',
    title: 'Fundraising Expert',
    description: 'Collect 50 donation forms',
    icon: '🎯',
    requirement: { type: 'forms', value: 50 },
  },
  {
    id: 'forms_100',
    title: 'Donation Master',
    description: 'Collect 100 donation forms',
    icon: '⭐',
    requirement: { type: 'forms', value: 100 },
  },

  // Supports Achievements (1 support = ₹1200)
  {
    id: 'first_support',
    title: 'First Support',
    description: 'Collect your first support (₹1200)',
    icon: '🤝',
    requirement: { type: 'supports', value: 1 },
  },
  {
    id: 'supports_10',
    title: 'Supporter',
    description: 'Collect 10 supports',
    icon: '💪',
    requirement: { type: 'supports', value: 10 },
  },
  {
    id: 'supports_25',
    title: 'Impact Maker',
    description: 'Collect 25 supports',
    icon: '🌟',
    requirement: { type: 'supports', value: 25 },
  },
  {
    id: 'supports_50',
    title: 'Change Agent',
    description: 'Collect 50 supports',
    icon: '🚀',
    requirement: { type: 'supports', value: 50 },
  },
  {
    id: 'supports_100',
    title: 'Support Legend',
    description: 'Collect 100 supports',
    icon: '🏅',
    requirement: { type: 'supports', value: 100 },
  },

  // Amount Achievements (in INR)
  {
    id: 'amount_10000',
    title: 'Rising Star',
    description: 'Raise ₹10,000 in donations',
    icon: '💰',
    requirement: { type: 'amount', value: 10000 },
  },
  {
    id: 'amount_50000',
    title: 'Fundraising Star',
    description: 'Raise ₹50,000 in donations',
    icon: '💎',
    requirement: { type: 'amount', value: 50000 },
  },
  {
    id: 'amount_100000',
    title: 'Lakh Club',
    description: 'Raise ₹1,00,000 in donations',
    icon: '🎖️',
    requirement: { type: 'amount', value: 100000 },
  },
  {
    id: 'amount_500000',
    title: 'Fundraising Elite',
    description: 'Raise ₹5,00,000 in donations',
    icon: '🏆',
    requirement: { type: 'amount', value: 500000 },
  },
  {
    id: 'amount_1000000',
    title: 'Million Maker',
    description: 'Raise ₹10,00,000 in donations',
    icon: '👑',
    requirement: { type: 'amount', value: 1000000 },
  },

  // Streak Achievements
  {
    id: 'streak_3',
    title: 'Consistent',
    description: 'Maintain a 3-day activity streak',
    icon: '🔥',
    requirement: { type: 'streak', value: 3 },
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: '📅',
    requirement: { type: 'streak', value: 7 },
  },
  {
    id: 'streak_14',
    title: 'Fortnight Fighter',
    description: 'Maintain a 14-day activity streak',
    icon: '⚡',
    requirement: { type: 'streak', value: 14 },
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day activity streak',
    icon: '🌙',
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'streak_60',
    title: 'Dedication King',
    description: 'Maintain a 60-day activity streak',
    icon: '🎯',
    requirement: { type: 'streak', value: 60 },
  },
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'Maintain a 100-day activity streak',
    icon: '🏆',
    requirement: { type: 'streak', value: 100 },
  },
];

/**
 * Get achievement by ID
 * 
 * @param id - Achievement ID
 * @returns Achievement definition or undefined
 */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get all achievements of a specific type
 * 
 * @param type - Achievement type to filter by
 * @returns Array of achievements of that type
 */
export function getAchievementsByType(type: AchievementType): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.requirement.type === type);
}

/**
 * Get achievements sorted by requirement value (ascending)
 * 
 * @param type - Optional type to filter by
 * @returns Sorted array of achievements
 */
export function getAchievementsSorted(type?: AchievementType): AchievementDefinition[] {
  const filtered = type ? getAchievementsByType(type) : ACHIEVEMENTS;
  return [...filtered].sort((a, b) => a.requirement.value - b.requirement.value);
}

/**
 * Convert AchievementDefinition to Achievement type used in the app
 * 
 * @param definition - Achievement definition
 * @param unlockedAt - Optional unlock timestamp
 * @returns Achievement object
 */
export function toAchievement(definition: AchievementDefinition, unlockedAt?: number): Achievement {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    requirement: definition.requirement,
    unlockedAt,
  };
}

/**
 * Get all achievements as Achievement type
 * 
 * @param unlockedIds - Map of achievement IDs to unlock timestamps
 * @returns Array of Achievement objects
 */
export function getAllAchievements(unlockedIds: Map<string, number> = new Map()): Achievement[] {
  return ACHIEVEMENTS.map(def => toAchievement(def, unlockedIds.get(def.id)));
}
