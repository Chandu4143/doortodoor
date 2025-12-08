import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Trophy, Flame, Settings, Save, 
  FileText, Heart, Users, TrendingUp, Award,
  Calendar, Zap, Briefcase
} from 'lucide-react';
import { GoalSettings, BusinessCampaign, Business, SUPPORT_VALUE } from '../../types';
import { 
  loadGoalSettings, saveGoalSettings, ACHIEVEMENTS, getTodayKey
} from '../../services/goalService';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';

interface CorporateGoalTrackerProps {
  campaigns: BusinessCampaign[];
}

export default function CorporateGoalTracker({ campaigns }: CorporateGoalTrackerProps) {
  const [settings, setSettings] = useState<GoalSettings>(loadGoalSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Calculate actual progress from campaigns data
  const actualProgress = useMemo(() => {
    const today = getTodayKey();
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 86400000;

    let todayPresentations = 0;
    let todayForms = 0;
    let todaySupports = 0;
    let todayAmount = 0;

    let totalPresentations = 0;
    let totalForms = 0;
    let totalSupports = 0;
    let totalAmount = 0;

    campaigns.forEach(camp => {
      camp.businesses.forEach(biz => {
        if (biz.status !== 'unvisited') {
          totalPresentations++;
          if (biz.updatedAt && biz.updatedAt >= todayStart && biz.updatedAt < todayEnd) {
            todayPresentations++;
          }
        }
        if (biz.status === 'donated') {
          totalForms++;
          const supports = Math.floor((biz.amountDonated || 0) / SUPPORT_VALUE);
          totalSupports += supports;
          totalAmount += biz.amountDonated || 0;

          if (biz.updatedAt && biz.updatedAt >= todayStart && biz.updatedAt < todayEnd) {
            todayForms++;
            todaySupports += supports;
            todayAmount += biz.amountDonated || 0;
          }
        }
      });
    });

    return {
      today: { presentations: todayPresentations, forms: todayForms, supports: todaySupports, amount: todayAmount },
      total: { presentations: totalPresentations, forms: totalForms, supports: totalSupports, amount: totalAmount }
    };
  }, [campaigns]);

  // Calculate week progress
  const weekProgress = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let presentations = 0, forms = 0, supports = 0, amount = 0;

    campaigns.forEach(camp => {
      camp.businesses.forEach(biz => {
        if (biz.updatedAt && biz.updatedAt >= weekStart.getTime() && biz.updatedAt < weekEnd.getTime()) {
          if (biz.status !== 'unvisited') presentations++;
          if (biz.status === 'donated') {
            forms++;
            supports += Math.floor((biz.amountDonated || 0) / SUPPORT_VALUE);
            amount += biz.amountDonated || 0;
          }
        }
      });
    });

    return { presentations, forms, supports, amount };
  }, [campaigns]);

  const handleSaveSettings = (newSettings: GoalSettings) => {
    setSettings(newSettings);
    saveGoalSettings(newSettings);
    setShowSettings(false);
  };

  const dailyTargets = settings.dailyTargets;
  const weeklyTargets = settings.weeklyTargets;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target size={20} className="text-blue-500" />
          Corporate Goals
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
            label="Visits"
            current={actualProgress.today.presentations}
            target={dailyTargets.presentations}
            icon={<Briefcase size={16} />}
            color="blue"
          />
          <ProgressCard
            label="Donations"
            current={actualProgress.today.forms}
            target={dailyTargets.forms}
            icon={<FileText size={16} />}
            color="green"
          />
          <ProgressCard
            label="Amount"
            current={actualProgress.today.amount}
            target={dailyTargets.supports * SUPPORT_VALUE}
            icon={<TrendingUp size={16} />}
            color="pink"
            isCurrency
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
            label="Visits"
            current={weekProgress.presentations}
            target={weeklyTargets.presentations}
            icon={<Briefcase size={16} />}
            color="purple"
          />
          <ProgressCard
            label="Donations"
            current={weekProgress.forms}
            target={weeklyTargets.forms}
            icon={<FileText size={16} />}
            color="emerald"
          />
          <ProgressCard
            label="Amount"
            current={weekProgress.amount}
            target={weeklyTargets.supports * SUPPORT_VALUE}
            icon={<TrendingUp size={16} />}
            color="rose"
            isCurrency
          />
        </div>
      </div>

      {/* Total Stats */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 text-white">
        <p className="text-xs uppercase tracking-wider opacity-60 mb-3">All Time Stats</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{actualProgress.total.presentations}</p>
            <p className="text-[10px] opacity-60">Visits</p>
          </div>
          <div>
            <p className="text-xl font-bold">{actualProgress.total.forms}</p>
            <p className="text-[10px] opacity-60">Donations</p>
          </div>
          <div>
            <p className="text-xl font-bold">{campaigns.length}</p>
            <p className="text-[10px] opacity-60">Campaigns</p>
          </div>
          <div>
            <p className="text-xl font-bold">₹{(actualProgress.total.amount / 1000).toFixed(0)}K</p>
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
        unlockedIds={settings.unlockedAchievements}
        totalStats={actualProgress.total}
        streak={settings.streak.currentStreak}
      />
    </div>
  );
}

// Progress Card Component
function ProgressCard({ 
  label, current, target, icon, color, isCurrency 
}: { 
  label: string; 
  current: number; 
  target: number; 
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'pink' | 'purple' | 'emerald' | 'rose';
  isCurrency?: boolean;
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
  const displayCurrent = isCurrency ? `₹${(current/1000).toFixed(0)}K` : current;
  const displayTarget = isCurrency ? `₹${(target/1000).toFixed(0)}K` : target;

  return (
    <div className={cn("p-3 rounded-xl", c.bg, isComplete && "ring-2 ring-offset-2 ring-green-500")}>
      <div className={cn("flex items-center gap-1 mb-2", c.text)}>
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {displayCurrent}<span className="text-xs text-slate-400">/{displayTarget}</span>
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

  useEffect(() => {
    if (isOpen) {
      setDaily(settings.dailyTargets);
      setWeekly(settings.weeklyTargets);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave({ ...settings, dailyTargets: daily, weeklyTargets: weekly });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Goal Settings">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            Daily Targets
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Visits</label>
              <input
                type="number"
                value={daily.presentations}
                onChange={e => setDaily({ ...daily, presentations: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Donations</label>
              <input
                type="number"
                value={daily.forms}
                onChange={e => setDaily({ ...daily, forms: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Amount (₹)</label>
              <input
                type="number"
                value={daily.supports * SUPPORT_VALUE}
                onChange={e => setDaily({ ...daily, supports: Math.floor(Number(e.target.value) / SUPPORT_VALUE) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-purple-500" />
            Weekly Targets
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Visits</label>
              <input
                type="number"
                value={weekly.presentations}
                onChange={e => setWeekly({ ...weekly, presentations: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Donations</label>
              <input
                type="number"
                value={weekly.forms}
                onChange={e => setWeekly({ ...weekly, forms: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Amount (₹)</label>
              <input
                type="number"
                value={weekly.supports * SUPPORT_VALUE}
                onChange={e => setWeekly({ ...weekly, supports: Math.floor(Number(e.target.value) / SUPPORT_VALUE) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Save Goals
        </button>
      </div>
    </Modal>
  );
}

// Achievements Modal
function AchievementsModal({
  isOpen, onClose, unlockedIds, totalStats, streak
}: {
  isOpen: boolean;
  onClose: () => void;
  unlockedIds: string[];
  totalStats: { presentations: number; forms: number; supports: number; amount: number };
  streak: number;
}) {
  const getProgress = (achievement: typeof ACHIEVEMENTS[0]) => {
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
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = unlockedIds.includes(achievement.id);
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
