import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Wallet, Briefcase, Target, CalendarCheck } from 'lucide-react';
import { BusinessCampaign } from '../../types';
import { BUSINESS_STATUS_CONFIG, BUSINESS_CATEGORY_CONFIG } from '../../constants';
import CorporateTasks from './CorporateTasks';

interface CorporateDashboardProps {
  campaigns: BusinessCampaign[];
  onBusinessClick?: (businessId: string, campaignId: string) => void;
}

const CorporateDashboard: React.FC<CorporateDashboardProps> = ({ campaigns, onBusinessClick }) => {
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

  if (campaigns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="bg-slate-100 p-6 rounded-full mb-6 animate-bounce"><TrendingUp size={48} className="opacity-50 text-slate-500" /></div>
        <h3 className="text-xl font-bold text-slate-700">No Data Yet</h3>
        <p className="max-w-xs text-center mt-2 text-slate-500">Create your first corporate campaign to start seeing analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-10">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Briefcase size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Businesses</p>
            <p className="text-3xl font-bold text-slate-800">{totalBusinesses}</p>
            <p className="text-xs text-slate-400 mt-1">{visitedCount} visited</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Wallet size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Raised</p>
            <p className="text-3xl font-bold text-slate-800">₹{totalRaised.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 mt-1">{donatedCount} donations</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
            <CalendarCheck size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pledged</p>
            <p className="text-3xl font-bold text-slate-800">₹{totalPledged.toLocaleString()}</p>
            <p className="text-xs text-purple-600 mt-1">pending collection</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-5 mb-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Target size={28} strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Goal Progress</p>
              <p className="text-3xl font-bold text-slate-800">{overallProgress}%</p>
            </div>
          </div>
          {totalTarget > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                <span>Target: ₹{totalTarget.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{width: `${overallProgress}%`}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Tasks */}
      {onBusinessClick && (
        <CorporateTasks campaigns={campaigns} onBusinessClick={onBusinessClick} />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">Status Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
                  {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-500 text-xs font-semibold ml-1">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Campaign */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">Funds by Campaign</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff'}} />
                <Bar dataKey="donations" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Business Categories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {Object.entries(BUSINESS_CATEGORY_CONFIG).map(([key, config]) => {
            const count = categoryCounts[key] || 0;
            const Icon = config.icon;
            return (
              <div key={key} className="bg-slate-50 rounded-xl p-4 text-center">
                <Icon size={24} className={`${config.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{config.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CorporateDashboard;
