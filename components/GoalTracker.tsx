import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, Trophy, Flame, Settings, Save, 
  FileText, Heart, Users, Award,
  Calendar, Zap, Loader2
} from 'lucide-react';
import { GoalSettings, GoalTargets, SUPPORT_VALUE, Achievement } from '../types';
import { 
  getGoalSettings, 
  updateGoalSettings,
  getTodayProgress,
  getWeekProgress,
  getTotalStats,
  toGoalTargets,
  toStreakData,
  updateStreak,
  type SupabaseGoalSettings,
  type DailyProgress
} from '../services/supabase/goalsService';
import {
  getAchievements,
  checkAchievements,
  getAchievementProgress
} from '../services/supabase/achievementsService';
import { ACHIEVEMENTS as ACHIEVEMENT_DEFINITIONS } from '../constants/achievements';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import Modal from './ui/Modal';

export default function GoalTracker() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GoalSettings | null>(null);
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null);
  const [weekProgress, setWeekProgress] = useState<DailyProgress | null>(null);
  const [totalStats, setTotalStats] = useState<{ presentations: number; forms: number; supports: number; amount: number } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  // Load all goal data from Supabase
  const loadGoalData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load goal settings
      const settingsResult = await getGoalSettings(user.id);
      if (settingsResult.success && settingsResult.settings) {
        const supabaseSettings = settingsResult.settings;
        const { dailyTargets, weeklyTargets } = toGoalTargets(supabaseSettings);
        const streak = toStreakData(supabaseSettings);
        
        setSettings({
          dailyTargets,
          weeklyTargets,
          streak,
          unlockedAchievements: [], // Will be loaded separately
        });
      }

      // Load today's progress (attributed to current user)
      const todayResult = await getTodayProgress(user.id);
      if (todayResult.success && todayResult.progress) {
        setTodayProgress(todayResult.progress);
      }

      // Load week's progress
      const weekResult = await getWeekProgress(user.id);
      if (weekResult.success && weekResult.progress) {
        setWeekProgress(weekResult.progress);
      }

      // Load total stats
      const statsResult = await getTotalStats(user.id);
      if (statsResult.success && statsResult.stats) {
        setTotalStats(statsResult.stats);
      }

      // Load achievements
      const achievementsResult = await getAchievements(user.id);
      if (achievementsResult.success && achievementsResult.achievements) {
        setAchievements(achievementsResult.achievements);
        
        // Update settings with unlocked achievement IDs
        const unlockedIds = achievementsResult.achievements
          .filter(a => a.unlockedAt)
          .map(a => a.id);
        
        setSettings(prev => prev ? { ...prev, unlockedAchievements: unlockedIds } : null);
      }

      // Check for new achievements
      const checkResult = await checkAchievements(user.id);
      if (checkResult.success && checkResult.newlyUnlocked && checkResult.newlyUnlocked.length > 0) {
        setNewlyUnlocked(checkResult.newlyUnlocked);
        // Refresh achievements list
        const refreshResult = await getAchievements(user.id);
        if (refreshResult.success && refreshResult.achievements) {
          setAchievements(refreshResult.achievements);
        }
      }

    } catch (err) {
      console.error('Error loading goal data:', err);
      setError('Failed to load goal data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadGoalData();
  }, [loadGoalData]);

  // Handle saving settings
  const handleSaveSettings = async (newSettings: GoalSettings) => {
    if (!user) return;

    try {
      const result = await updateGoalSettings(user.id, {
        daily_presentations: newSettings.dailyTargets.presentations,
        daily_forms: newSettings.dailyTargets.forms,
        daily_supports: newSettings.dailyTargets.supports,
        weekly_presentations: newSettings.weeklyTargets.presentations,
        weekly_forms: newSettings.weeklyTargets.forms,
        weekly_supports: newSettings.weeklyTargets.supports,
      });

      if (result.success) {
        setSettings(newSettings);
        setShowSettings(false);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  // Dismiss newly unlocked achievements notification
  const dismissNewAchievements = () => {
    setNewlyUnlocked([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
        <p>{error}</p>
        <button 
          onClick={loadGoalData}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const dailyTargets = settings.dailyTargets;
  const weeklyTargets = settings.weeklyTargets;

  return (
    <div className="space-y-4">
      {/* New Achievement Notification */}
      {newlyUnlocked.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy size={24} />
              <div>
                <p className="font-bold">Achievement Unlocked!</p>
                <p className="text-sm opacity-90">
                  {newlyUnlocked.map(a => a.title).join(', ')}
                </p>
              </div>
            </div>
            <button 
              onClick={dismissNewAchievements}
              className="p-1 hover:bg-white/20 rounded"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target size={20} className="text-blue-500" />
          Goal Tracker
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAchievements(true)}
            className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <Trophy size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Streak Banner */}
      {settings.streak.currentStreak > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl text-white flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-sm opacity-90">Current Streak</p>
            <p className="text-2xl font-bold">{settings.streak.currentStreak} Days</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs opacity-75">Best</p>
            <p className="font-bold">{settings.streak.longestStreak} days</p>
          </div>
        </div>
      )}

      {/* Today's Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Today's Progress</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <ProgressCard
            label="Presentations"
            current={todayProgress?.presentations || 0}
            target={dailyTargets.presentations}
            icon={<Users size={16} />}
            color="blue"
          />
          <ProgressCard
            label="Forms"
            current={todayProgress?.forms || 0}
            target={dailyTargets.forms}
            icon={<FileText size={16} />}
            color="green"
          />
          <ProgressCard
            label="Supports"
            current={todayProgress?.supports || 0}
            target={dailyTargets.supports}
            icon={<Heart size={16} />}
            color="pink"
          />
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-purple-500" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">This Week</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <ProgressCard
            label="Presentations"
            current={weekProgress?.presentations || 0}
            target={weeklyTargets.presentations}
            icon={<Users size={16} />}
            color="purple"
          />
          <ProgressCard
            label="Forms"
            current={weekProgress?.forms || 0}
            target={weeklyTargets.forms}
            icon={<FileText size={16} />}
            color="emerald"
          />
          <ProgressCard
            label="Supports"
            current={weekProgress?.supports || 0}
            target={weeklyTargets.supports}
            icon={<Heart size={16} />}
            color="rose"
          />
        </div>
      </div>

      {/* Total Stats */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 text-white">
        <p className="text-xs uppercase tracking-wider opacity-60 mb-3">All Time Stats</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{totalStats?.presentations || 0}</p>
            <p className="text-[10px] opacity-60">Visits</p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalStats?.forms || 0}</p>
            <p className="text-[10px] opacity-60">Forms</p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalStats?.supports || 0}</p>
            <p className="text-[10px] opacity-60">Supports</p>
          </div>
          <div>
            <p className="text-xl font-bold">₹{((totalStats?.amount || 0) / 1000).toFixed(0)}K</p>
            <p className="text-[10px] opacity-60">Raised</p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <GoalSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
        totalStats={totalStats || { presentations: 0, forms: 0, supports: 0, amount: 0 }}
        streak={settings.streak.currentStreak}
      />
    </div>
  );
}


// Progress Card Component
function ProgressCard({ 
  label, current, target, icon, color 
}: { 
  label: string; 
  current: number; 
  target: number; 
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'pink' | 'purple' | 'emerald' | 'rose';
}) {
  const percentage = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));
  const isComplete = current >= target;

  const colorClasses = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', bar: 'bg-pink-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
  };

  const c = colorClasses[color];

  return (
    <div className={cn("p-3 rounded-xl", c.bg, isComplete && "ring-2 ring-offset-2 ring-green-500")}>
      <div className={cn("flex items-center gap-1 mb-2", c.text)}>
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {current}<span className="text-xs text-slate-400">/{target}</span>
      </p>
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", c.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Goal Settings Modal
function GoalSettingsModal({
  isOpen, onClose, settings, onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: GoalSettings;
  onSave: (settings: GoalSettings) => void;
}) {
  const [daily, setDaily] = useState(settings.dailyTargets);
  const [weekly, setWeekly] = useState(settings.weeklyTargets);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDaily(settings.dailyTargets);
      setWeekly(settings.weeklyTargets);
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...settings, dailyTargets: daily, weeklyTargets: weekly });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Goal Settings">
      <div className="space-y-6">
        {/* Daily Goals */}
        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            Daily Targets
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Presentations</label>
              <input
                type="number"
                value={daily.presentations}
                onChange={e => setDaily({ ...daily, presentations: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Forms</label>
              <input
                type="number"
                value={daily.forms}
                onChange={e => setDaily({ ...daily, forms: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Supports</label>
              <input
                type="number"
                value={daily.supports}
                onChange={e => setDaily({ ...daily, supports: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">1 Support = ₹{SUPPORT_VALUE.toLocaleString()}</p>
        </div>

        {/* Weekly Goals */}
        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-purple-500" />
            Weekly Targets
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Presentations</label>
              <input
                type="number"
                value={weekly.presentations}
                onChange={e => setWeekly({ ...weekly, presentations: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Forms</label>
              <input
                type="number"
                value={weekly.forms}
                onChange={e => setWeekly({ ...weekly, forms: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Supports</label>
              <input
                type="number"
                value={weekly.supports}
                onChange={e => setWeekly({ ...weekly, supports: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {isSaving ? 'Saving...' : 'Save Goals'}
        </button>
      </div>
    </Modal>
  );
}

// Achievements Modal
function AchievementsModal({
  isOpen, onClose, achievements, totalStats, streak
}: {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  totalStats: { presentations: number; forms: number; supports: number; amount: number };
  streak: number;
}) {
  const getProgress = (achievement: Achievement) => {
    let current = 0;
    switch (achievement.requirement.type) {
      case 'presentations': current = totalStats.presentations; break;
      case 'forms': current = totalStats.forms; break;
      case 'supports': current = totalStats.supports; break;
      case 'amount': current = totalStats.amount; break;
      case 'streak': current = streak; break;
    }
    return { current, target: achievement.requirement.value };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Achievements">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {achievements.map(achievement => {
          const isUnlocked = !!achievement.unlockedAt;
          const { current, target } = getProgress(achievement);
          const percentage = Math.min(100, Math.round((current / target) * 100));

          return (
            <div
              key={achievement.id}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                isUnlocked
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                  isUnlocked ? "bg-amber-100 dark:bg-amber-900/40" : "bg-slate-200 dark:bg-slate-700 grayscale"
                )}>
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{achievement.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{achievement.description}</p>
                  {!isUnlocked && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{current} / {target}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {isUnlocked && (
                  <Award size={20} className="text-amber-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
