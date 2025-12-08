import { GoalSettings, GoalProgress, GoalTargets, StreakData, Achievement, SUPPORT_VALUE } from '../types';

const LS_KEY_GOALS = 'doorstep_goals_v1';
const LS_KEY_PROGRESS = 'doorstep_progress_v1';

// Default achievements
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_form', title: 'First Form', description: 'Complete your first donation form', icon: '📝', requirement: { type: 'forms', value: 1 } },
  { id: 'form_5', title: 'Form Filler', description: 'Complete 5 donation forms', icon: '📋', requirement: { type: 'forms', value: 5 } },
  { id: 'form_25', title: 'Form Master', description: 'Complete 25 donation forms', icon: '🏆', requirement: { type: 'forms', value: 25 } },
  { id: 'form_100', title: 'Form Legend', description: 'Complete 100 donation forms', icon: '👑', requirement: { type: 'forms', value: 100 } },
  { id: 'support_1', title: 'First Support', description: 'Get your first support', icon: '💝', requirement: { type: 'supports', value: 1 } },
  { id: 'support_10', title: 'Supporter', description: 'Collect 10 supports', icon: '🌟', requirement: { type: 'supports', value: 10 } },
  { id: 'support_50', title: 'Super Supporter', description: 'Collect 50 supports', icon: '⭐', requirement: { type: 'supports', value: 50 } },
  { id: 'present_10', title: 'Door Knocker', description: 'Make 10 presentations', icon: '🚪', requirement: { type: 'presentations', value: 10 } },
  { id: 'present_50', title: 'Presenter Pro', description: 'Make 50 presentations', icon: '🎯', requirement: { type: 'presentations', value: 50 } },
  { id: 'present_200', title: 'Presentation King', description: 'Make 200 presentations', icon: '🎪', requirement: { type: 'presentations', value: 200 } },
  { id: 'streak_3', title: 'On Fire', description: '3 day streak', icon: '🔥', requirement: { type: 'streak', value: 3 } },
  { id: 'streak_7', title: 'Week Warrior', description: '7 day streak', icon: '💪', requirement: { type: 'streak', value: 7 } },
  { id: 'streak_30', title: 'Monthly Master', description: '30 day streak', icon: '🏅', requirement: { type: 'streak', value: 30 } },
  { id: 'amount_10k', title: 'Fundraiser', description: 'Raise ₹10,000', icon: '💰', requirement: { type: 'amount', value: 10000 } },
  { id: 'amount_50k', title: 'Big Fundraiser', description: 'Raise ₹50,000', icon: '💎', requirement: { type: 'amount', value: 50000 } },
  { id: 'amount_100k', title: 'Lakh Club', description: 'Raise ₹1,00,000', icon: '🎖️', requirement: { type: 'amount', value: 100000 } },
];

const defaultGoalSettings: GoalSettings = {
  dailyTargets: { presentations: 20, forms: 5, supports: 3 },
  weeklyTargets: { presentations: 100, forms: 25, supports: 15 },
  streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: '' },
  unlockedAchievements: [],
};

export const loadGoalSettings = (): GoalSettings => {
  try {
    const raw = localStorage.getItem(LS_KEY_GOALS);
    return raw ? { ...defaultGoalSettings, ...JSON.parse(raw) } : defaultGoalSettings;
  } catch {
    return defaultGoalSettings;
  }
};

export const saveGoalSettings = (settings: GoalSettings) => {
  localStorage.setItem(LS_KEY_GOALS, JSON.stringify(settings));
};

export const loadProgressHistory = (): GoalProgress[] => {
  try {
    const raw = localStorage.getItem(LS_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveProgressHistory = (history: GoalProgress[]) => {
  localStorage.setItem(LS_KEY_PROGRESS, JSON.stringify(history));
};

export const getTodayKey = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

export const getTodayProgress = (history: GoalProgress[]): GoalProgress => {
  const today = getTodayKey();
  const existing = history.find(p => p.date === today);
  return existing || { date: today, presentations: 0, forms: 0, supports: 0, amount: 0 };
};

export const getWeekProgress = (history: GoalProgress[]): GoalProgress => {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const weekProgress = history.filter(p => {
    const d = new Date(p.date);
    return d >= new Date(weekStart) && d < weekEnd;
  });

  return weekProgress.reduce(
    (acc, p) => ({
      date: weekStart,
      presentations: acc.presentations + p.presentations,
      forms: acc.forms + p.forms,
      supports: acc.supports + p.supports,
      amount: acc.amount + p.amount,
    }),
    { date: weekStart, presentations: 0, forms: 0, supports: 0, amount: 0 }
  );
};

export const updateStreak = (settings: GoalSettings, hadActivity: boolean): StreakData => {
  const today = getTodayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  let { currentStreak, longestStreak, lastActiveDate } = settings.streak;

  if (hadActivity) {
    if (lastActiveDate === today) {
      // Already counted today
    } else if (lastActiveDate === yesterdayKey) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    lastActiveDate = today;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return { currentStreak, longestStreak, lastActiveDate };
};

export const checkNewAchievements = (
  settings: GoalSettings,
  totalStats: { presentations: number; forms: number; supports: number; amount: number }
): string[] => {
  const newlyUnlocked: string[] = [];

  ACHIEVEMENTS.forEach(achievement => {
    if (settings.unlockedAchievements.includes(achievement.id)) return;

    let unlocked = false;
    switch (achievement.requirement.type) {
      case 'presentations':
        unlocked = totalStats.presentations >= achievement.requirement.value;
        break;
      case 'forms':
        unlocked = totalStats.forms >= achievement.requirement.value;
        break;
      case 'supports':
        unlocked = totalStats.supports >= achievement.requirement.value;
        break;
      case 'amount':
        unlocked = totalStats.amount >= achievement.requirement.value;
        break;
      case 'streak':
        unlocked = settings.streak.currentStreak >= achievement.requirement.value;
        break;
    }

    if (unlocked) {
      newlyUnlocked.push(achievement.id);
    }
  });

  return newlyUnlocked;
};

export const calculateSupportsFromAmount = (amount: number): number => {
  return Math.floor(amount / SUPPORT_VALUE);
};
