import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Users, Wallet, Briefcase, Target, CalendarCheck,
  Building2, Map, ArrowRight, Loader2, Sparkles, Rocket, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BusinessCampaign } from '../../types';
import { BUSINESS_STATUS_CONFIG, BUSINESS_CATEGORY_CONFIG } from '../../constants';
import CorporateTasks from './CorporateTasks';
import DashboardLayout from '../ui/DashboardLayout';

interface CorporateDashboardProps {
  campaigns: BusinessCampaign[];
  onBusinessClick?: (businessId: string, campaignId: string) => void;
  onCreateCampaign?: () => void;
}

const CorporateDashboard: React.FC<CorporateDashboardProps> = ({ campaigns, onBusinessClick, onCreateCampaign }) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Calculations
  let totalBusinesses = 0, visitedCount = 0, donatedCount = 0, totalRaised = 0, totalPledged = 0, totalTarget = 0;
  const statusCounts: Record<string, number> = { unvisited: 0, donated: 0, not_interested: 0, callback: 0, meeting_scheduled: 0, follow_up: 0 };
  const categoryCounts: Record<string, number> = {};

  const campaignData = campaigns.map(c => {
    let cDonations = 0;
    c.businesses.forEach(b => {
      totalBusinesses++;
      statusCounts[b.status]++;
      categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
      if (b.status !== 'unvisited') visitedCount++;
      if (b.status === 'donated') { donatedCount++; cDonations += (b.amountDonated || 0); }
      totalPledged += (b.amountPledged || 0);
    });
    totalRaised += cDonations;
    totalTarget += (c.targetAmount || 0);
    return { name: c.name, donations: cDonations, businesses: c.businesses.length };
  });

  const pieData = Object.keys(statusCounts).map(key => ({
    name: BUSINESS_STATUS_CONFIG[key as keyof typeof BUSINESS_STATUS_CONFIG].label,
    value: statusCounts[key]
  }));

  const COLORS = ['#cbd5e1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalRaised / totalTarget) * 100)) : 0;
  const coveragePercent = totalBusinesses > 0 ? Math.round((visitedCount / totalBusinesses) * 100) : 0;

  if (campaigns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center">
            <Rocket size={48} className="text-blue-500" />
          </div>
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-lg"
          >
            ✨
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-sm"
        >
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Ready to Start?
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Create your first corporate campaign and watch your fundraising progress come to life!
          </p>

          {onCreateCampaign && (
            <button
              onClick={onCreateCampaign}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all"
            >
              <Plus size={20} />
              Create Campaign
            </button>
          )}
        </motion.div>

        {/* Feature hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid grid-cols-3 gap-6 max-w-md"
        >
          {[
            { icon: '🏢', label: 'Track Buildings' },
            { icon: '📊', label: 'View Analytics' },
            { icon: '🎯', label: 'Set Goals' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Top Controls */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex-1"></div>
        {/* View Toggle */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'list'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
          >
            <Building2 size={16} /> List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'map'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
          >
            <Map size={16} /> Map
          </button>
        </div>
      </div>

      {viewMode === 'map' && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700">
          <Map className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Map view coming soon for Corporate campaigns</p>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          {/* Top Metric Cards - Animated & Unified Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Businesses Count */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <Briefcase size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Businesses</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{totalBusinesses}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${coveragePercent}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{visitedCount} visited</p>
            </motion.div>

            {/* Total Raised */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                  <Wallet size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Raised</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">₹{totalRaised.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-3 ml-1 flex items-center gap-1">
                <TrendingUp size={10} /> +{donatedCount} donations
              </p>
            </motion.div>

            {/* Pledged Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                  <CalendarCheck size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pledged</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">₹{totalPledged.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">Pending collection</p>
            </motion.div>

            {/* Goal Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <Target size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Goal Progress</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{overallProgress}%</p>
                </div>
              </div>
              {totalTarget > 0 && (
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Target: ₹{totalTarget.toLocaleString()}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Pending Tasks & Action Items */}
          {onBusinessClick && (
            <CorporateTasks campaigns={campaigns} onBusinessClick={onBusinessClick} />
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Status Breakdown</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
                      {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance by Campaign */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Funds by Campaign</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: 'rgba(248, 250, 252, 0.1)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="donations" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category Breakdown - Horizontal Scroll or Grid */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Business Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {Object.entries(BUSINESS_CATEGORY_CONFIG).map(([key, config]) => {
                const count = categoryCounts[key] || 0;
                const Icon = config.icon;
                return (
                  <div key={key} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-800">
                    <Icon size={24} className={`${config.color} mx-auto mb-2`} />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default CorporateDashboard;
