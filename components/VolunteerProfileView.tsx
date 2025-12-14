
import React, { useEffect, useState } from 'react';
import { User, Medal, Star, TrendingUp, Calendar, Mail, Phone, MapPin, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserXP, type UserXP } from '../services/supabase/gamificationService';
import { cn } from '../utils/cn';

export default function VolunteerProfileView() {
    const { profile, user } = useAuth();
    const [xpStats, setXpStats] = useState<UserXP>({ total_xp: 0, level: 1 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getUserXP(user.id).then(res => {
                if (res.success && res.xp) {
                    setXpStats(res.xp);
                }
                setLoading(false);
            });
        }
    }, [user]);

    if (!profile) return null;

    // Calculate level progress (simplified: 1000 XP per level)
    const xpForCurrentLevel = (xpStats.level - 1) * 1000;
    const nextLevelXp = xpStats.level * 1000;
    const currentLevelProgress = xpStats.total_xp - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.max(0, (currentLevelProgress / 1000) * 100));

    return (
        <div className="max-w-2xl mx-auto pb-10">
            {/* Header / Cover */}
            <div className="relative mb-16">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg"></div>
                <div className="absolute -bottom-12 left-8 flex items-end gap-4">
                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-xl">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                                <User size={40} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4">
                <div className="flex justify-between items-start mb-6">
                    <div className="pt-2">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {profile.name}
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-mono uppercase">
                                {profile.role || 'Volunteer'}
                            </span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-4 mt-1">
                            <span>Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
                        </p>
                    </div>
                    {/* Badge / Rank Display */}
                    <div className="text-center">
                        <div className="inline-flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl min-w-[80px]">
                            <span className="text-amber-600 dark:text-amber-400 font-black text-2xl leading-none">{xpStats.level}</span>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Level</span>
                        </div>
                    </div>
                </div>

                {/* XP Progress */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-8 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Experience</p>
                            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                {xpStats.total_xp.toLocaleString()} <span className="text-sm font-normal text-slate-400">XP</span>
                            </p>
                        </div>
                        <p className="text-xs text-slate-400">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{1000 - currentLevelProgress} XP</span> to Level {xpStats.level + 1}
                        </p>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Detailed Stats Grid */}
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Achievements</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {/* Placeholder Stats - Ideally fetched from a stats service */}
                    <StatCard icon={TrendingUp} label="Total Raised" value="₹0" color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
                    <StatCard icon={MapPin} label="Locations" value="0" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
                    <StatCard icon={Award} label="Badges" value="0" color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
                    <StatCard icon={Calendar} label="Days Active" value="0" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-3", bg)}>
                <Icon size={20} className={color} />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-white mb-0.5">{value}</p>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
        </div>
    );
}
