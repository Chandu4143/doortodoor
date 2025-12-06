import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Sparkles, Loader2, TrendingUp, Users, Wallet, ArrowRight } from 'lucide-react';
import { Apartment, Room } from '../types';
import { generateFundraisingInsights } from '../services/geminiService';
import { STATUS_CONFIG } from '../constants';

interface DashboardProps {
  apartments: Apartment[];
}

const Dashboard: React.FC<DashboardProps> = ({ apartments }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Calculations ---
  let totalRooms = 0;
  let visitedCount = 0;
  let donatedCount = 0;
  let totalRaised = 0;
  
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

  if (apartments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="bg-slate-100 p-6 rounded-full mb-6 animate-bounce">
            <TrendingUp size={48} className="opacity-50 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">No Data Yet</h3>
        <p className="max-w-xs text-center mt-2 text-slate-500">Create your first apartment campaign to start seeing analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-10">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Users size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coverage</p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-800">{Math.round((visitedCount / Math.max(totalRooms, 1)) * 100)}%</p>
                <span className="text-sm font-medium text-slate-500">visited</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{visitedCount} of {totalRooms} doors knocked</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Wallet size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Raised</p>
            <p className="text-3xl font-bold text-slate-800">₹{totalRaised.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                {donatedCount} contributions
            </p>
          </div>
        </div>

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
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Analyze Progress <ArrowRight size={14}/></>}
            </button>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </div>

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
                   contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                   itemStyle={{color: '#fff'}}
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
              <BarChart data={apartmentData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#64748b'}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#fff'}}
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
    </div>
  );
};

export default Dashboard;