import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Sparkles, Loader2, TrendingUp, Users, Wallet, ArrowRight, Building, Map, Target, Plus, Rocket } from 'lucide-react';
import { Apartment, Room } from '../types';
import { generateFundraisingInsights } from '../services/geminiService';
import { STATUS_CONFIG } from '../constants';
import TodaysTasks from './TodaysTasks';
import { DashboardSkeleton } from './ui/SkeletonLoader';
import AnnouncementBanner from './AnnouncementBanner';
import CampaignMap from './CampaignMap';
import DashboardLayout from './ui/DashboardLayout';

interface DashboardProps {
  apartments: Apartment[];
  onRoomClick?: (roomId: string, floor: string, apartmentId: string) => void;
  onCreateCampaign?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ apartments, onRoomClick, onCreateCampaign }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Simulate initial load for skeleton
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // --- Calculations ---
  let totalRooms = 0;
  let visitedCount = 0;
  let donatedCount = 0;
  let totalRaised = 0;
  let totalTarget = 0;

  const statusCounts: Record<string, number> = {
    unvisited: 0,
    donated: 0,
    not_interested: 0,
    callback: 0,
    other: 0
  };

  const apartmentData = apartments.map(apt => {

    let aptDonations = 0;
    Object.values(apt.rooms).forEach((floor: Room[]) => {
      floor.forEach(room => {
        totalRooms++;
        statusCounts[room.status]++;
        if (room.status !== 'unvisited') visitedCount++;
        if (room.status === 'donated') {
          donatedCount++;
          aptDonations += (room.amountDonated || 0);
        }
      });
    });
    totalRaised += aptDonations;
    totalTarget += (apt.targetAmount || 0);
    return { name: apt.name, donations: aptDonations };
  });

  const pieData = Object.keys(statusCounts).map(key => ({
    name: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG].label,
    value: statusCounts[key],
    color: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG].color.replace('text-', 'stroke-')
  }));

  // Refined Color Palette for Charts
  const COLORS = ['#cbd5e1', '#10b981', '#ef4444', '#f59e0b', '#64748b'];

  const handleGenerateInsights = async () => {
    if (apartments.length === 0) return;
    setIsLoading(true);
    try {
      const result = await generateFundraisingInsights(apartments);
      setAiInsight(result);
    } catch (e) {
      alert("Could not generate insights. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show skeleton during initial load
  if (isInitialLoad && apartments.length > 0) {
    return <DashboardSkeleton />;
  }

  if (apartments.length === 0) {
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
            Create your first apartment campaign and watch your fundraising progress come to life!
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

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalRaised / totalTarget) * 100)) : 0;
  const conversionRate = visitedCount > 0 ? Math.round((donatedCount / visitedCount) * 100) : 0;
  const avgDonation = donatedCount > 0 ? Math.round(totalRaised / donatedCount) : 0;

  const coveragePercent = Math.round((visitedCount / Math.max(totalRooms, 1)) * 100);

  return (
    <DashboardLayout>
      {/* Top Controls */}
      <div className="flex justify-between items-center mb-4">
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
            <Building size={16} /> List
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

      {/* Team Announcements */}
      <AnnouncementBanner />

      {/* Map View */}
      {viewMode === 'map' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <CampaignMap apartments={apartments} onSelectApartment={(id) => onRoomClick?.(null!, null!, id)} />
        </motion.div>
      )}

      {viewMode === 'list' && (
        <>
          {/* Top Metric Cards - Animated */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <Users size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coverage</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{coveragePercent}%</p>
                </div>
              </div>
              {/* Animated progress bar */}
              <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${coveragePercent}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{visitedCount} of {totalRooms} doors</p>
            </motion.div>

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
              {totalTarget > 0 && (
                <>
                  <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ delay: 0.4, duration: 0.8 }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">{overallProgress}% of ₹{totalTarget.toLocaleString()}</p>
                </>
              )}
            </motion.div>

            {/* Conversion Rate Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                  <Target size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{conversionRate}%</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionRate}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{donatedCount} of {visitedCount} donated</p>
            </motion.div>

            {/* Average Donation Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg. Donation</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">₹{avgDonation.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">per donor</p>
            </motion.div>
          </div>

          {/* AI Action Card - Full Width */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* AI Action Card */}
            <div className="group bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles size={16} className="text-yellow-300" />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight">AI Coach</h3>
                </div>
                <p className="text-sm text-indigo-100 mb-5 leading-relaxed opacity-90">
                  Generate strategic insights and motivational tips based on your live campaign data.
                </p>
                <button
                  onClick={handleGenerateInsights}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-white text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Analyze Progress <ArrowRight size={14} /></>}
                </button>
              </div>
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            </div>
          </div>

          {/* Today's Tasks - Pending Callbacks */}
          {onRoomClick && (
            <TodaysTasks apartments={apartments} onRoomClick={onRoomClick} />
          )}

          {/* AI Insight Result */}
          {aiInsight && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl animate-in slide-in-from-top-4 shadow-sm">
              <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Sparkles size={16} className="text-indigo-500" /> Analysis Result
              </h4>
              <div className="prose prose-sm prose-indigo max-w-none bg-white p-6 rounded-xl border border-indigo-50 shadow-sm">
                <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{aiInsight}</pre>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800">Status Breakdown</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-slate-500 text-xs font-semibold ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance by Building */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6">Funds by Building</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={apartmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar
                      dataKey="donations"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Heatmaps Section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Map size={24} className="text-blue-500" />
              Campaign Heatmaps
            </h2>
            <p className="text-slate-500 text-sm">Visual overview of door knocking progress. Identify gaps and patterns by building.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {apartments.map(apt => {
                // Calculate local stats
                let aptVisited = 0;
                let aptTotal = 0;
                (Object.values(apt.rooms).flat() as Room[]).forEach(r => {
                  aptTotal++;
                  if (r.status !== 'unvisited') aptVisited++;
                });
                const percentage = aptTotal === 0 ? 0 : Math.round((aptVisited / aptTotal) * 100);
                const floors = Object.keys(apt.rooms).sort((a, b) => Number(b) - Number(a));

                return (
                  <div key={apt.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-slate-700 truncate pr-4">{apt.name}</h3>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                          {percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Progress</span>
                        <span className="text-[10px] font-medium text-slate-500">{aptVisited} / {aptTotal} units</span>
                      </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="p-5 overflow-x-auto">
                      <div className="min-w-max">
                        {floors.map(floor => (
                          <div key={floor} className="flex items-center gap-2 mb-1.5">
                            {/* Floor Label */}
                            <div className="w-6 text-[10px] font-bold text-slate-400 text-right shrink-0">{floor}</div>

                            {/* Units Row */}
                            <div className="flex gap-1.5">
                              {apt.rooms[floor].map(room => {
                                const config = STATUS_CONFIG[room.status];
                                return (
                                  <div
                                    key={room.id}
                                    className={`w-4 h-4 rounded-[3px] transition-colors cursor-help ${config.bg.replace('bg-', 'bg-').replace(' border-amber-200', '').replace(' border-green-200', '').replace(' border-red-200', '').replace(' border-gray-200', '')}`}
                                    // Override simplistic bg parsing for heatmap clarity
                                    style={{
                                      backgroundColor:
                                        room.status === 'donated' ? '#10b981' :
                                          room.status === 'not_interested' ? '#ef4444' :
                                            room.status === 'callback' ? '#f59e0b' :
                                              room.status === 'other' ? '#94a3b8' : '#e2e8f0'
                                    }}
                                    title={`Unit ${room.roomNumber}: ${config.label}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Heatmap Legend */}
                      <div className="mt-4 flex flex-wrap gap-3 justify-center pt-3 border-t border-slate-50">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                          if (key === 'unvisited') return null;
                          return (
                            <div key={key} className="flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded-[2px]"
                                style={{
                                  backgroundColor:
                                    key === 'donated' ? '#10b981' :
                                      key === 'not_interested' ? '#ef4444' :
                                        key === 'callback' ? '#f59e0b' : '#94a3b8'
                                }}
                              />
                              <span className="text-[10px] font-medium text-slate-500">{config.label}</span>
                            </div>
                          )
                        })}
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-200" />
                          <span className="text-[10px] font-medium text-slate-500">Unvisited</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;