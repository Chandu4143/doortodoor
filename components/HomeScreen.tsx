import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, Building2, Briefcase, ArrowRight, Users, TrendingUp, 
  Clock, ChevronRight, Sparkles, Target, Zap
} from 'lucide-react';
import { AppMode, Apartment } from '../types';
import { loadCampaigns } from '../services/corporateStorageService';
import { cn } from '../utils/cn';

interface HomeScreenProps {
  onSelectMode: (mode: AppMode) => void;
  residentialStats: { campaigns: number; totalRaised: number };
  corporateStats: { campaigns: number; totalRaised: number };
  apartments?: Apartment[];
  onQuickResume?: (apartmentId: string) => void;
}

export default function HomeScreen({ 
  onSelectMode, 
  residentialStats, 
  corporateStats,
  apartments = [],
  onQuickResume
}: HomeScreenProps) {
  
  // Find most recently updated campaign
  const recentCampaign = useMemo(() => {
    if (apartments.length === 0) return null;
    
    let mostRecent: { apartment: Apartment; lastUpdate: number; progress: number } | null = null;
    
    apartments.forEach(apt => {
      let lastUpdate = apt.createdAt;
      let visited = 0;
      let total = 0;
      
      Object.values(apt.rooms).forEach((floor: any[]) => {
        floor.forEach(room => {
          total++;
          if (room.status !== 'unvisited') visited++;
          if (room.updatedAt && room.updatedAt > lastUpdate) {
            lastUpdate = room.updatedAt;
          }
        });
      });
      
      const progress = total > 0 ? Math.round((visited / total) * 100) : 0;
      
      if (!mostRecent || lastUpdate > mostRecent.lastUpdate) {
        mostRecent = { apartment: apt, lastUpdate, progress };
      }
    });
    
    return mostRecent;
  }, [apartments]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const totalRaised = residentialStats.totalRaised + corporateStats.totalRaised;
  const totalCampaigns = residentialStats.campaigns + corporateStats.campaigns;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 text-center pt-10 sm:pt-12"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/50 mb-4"
        >
          <Home size={32} className="text-white" />
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-2">
          DoorStep
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Your fundraising companion
        </p>
      </motion.div>

      {/* Quick Stats Banner */}
      {totalCampaigns > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-6 sm:mx-8 mb-4"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs opacity-80 font-medium">Total Raised</p>
                  <p className="text-2xl font-bold">₹{totalRaised.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80 font-medium">Campaigns</p>
                <p className="text-xl font-bold">{totalCampaigns}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Resume Card */}
      {recentCampaign && onQuickResume && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-6 sm:mx-8 mb-6"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock size={12} />
            Continue where you left off
          </p>
          <button
            onClick={() => onQuickResume(recentCampaign.apartment.id)}
            className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    {recentCampaign.apartment.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {recentCampaign.apartment.floors} floors • {formatTimeAgo(recentCampaign.lastUpdate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {recentCampaign.progress}%
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">Complete</p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${recentCampaign.progress}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </button>
        </motion.div>
      )}

      {/* Mode Selection Cards */}
      <div className="flex-1 flex items-start justify-center p-6 sm:p-8 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl w-full">
          
          {/* Residential Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => onSelectMode('residential')}
            className={cn(
              "group relative bg-white dark:bg-slate-800 rounded-3xl p-6 text-left",
              "border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700",
              "shadow-lg shadow-slate-100 dark:shadow-black/20 hover:shadow-xl hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20",
              "transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 size={24} />
              </div>
              <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Residential
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Apartments & housing societies
            </p>

            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                <Users size={12} />
                <span>{residentialStats.campaigns}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={12} />
                <span>₹{residentialStats.totalRaised.toLocaleString()}</span>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />
          </motion.button>

          {/* Corporate Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => onSelectMode('corporate')}
            className={cn(
              "group relative bg-white dark:bg-slate-800 rounded-3xl p-6 text-left",
              "border-2 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700",
              "shadow-lg shadow-slate-100 dark:shadow-black/20 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/20",
              "transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase size={24} />
              </div>
              <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Corporate
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Offices, shops & businesses
            </p>

            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                <Users size={12} />
                <span>{corporateStats.campaigns}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <TrendingUp size={12} />
                <span>₹{corporateStats.totalRaised.toLocaleString()}</span>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
          </motion.button>

        </div>
      </div>

      {/* Empty State CTA */}
      {totalCampaigns === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-6 pb-8 text-center"
        >
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-900/50 max-w-md mx-auto">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Ready to start?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create your first campaign and start tracking donations today!
            </p>
          </div>
        </motion.div>
      )}

      {/* Footer hint */}
      <div className="p-4 text-center">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-wider">
          Residential for weekends • Corporate for weekdays
        </p>
      </div>
    </div>
  );
}
