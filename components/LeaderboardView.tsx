import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Users, Target, ArrowUp, Star, Zap } from 'lucide-react';
import { Apartment, Room } from '../types';
import { cn } from '../utils/cn';
import { getLeaderboard } from '../services/supabase/gamificationService';

interface LeaderboardViewProps {
    apartments: Apartment[];
}

type LeaderboardMetric = 'raised' | 'doors' | 'donations' | 'xp';

interface MemberStats {
    id: string; // collectedBy
    name: string; // collectedByName
    totalRaised: number;
    doorsKnocked: number;
    donationCount: number;
    lastActive: number;
    xp?: number;
    level?: number;
}

export default function LeaderboardView({ apartments }: LeaderboardViewProps) {
    const [metric, setMetric] = useState<LeaderboardMetric>('raised');
    const [xpLeaderboard, setXpLeaderboard] = useState<MemberStats[]>([]);

    React.useEffect(() => {
        if (metric === 'xp' && xpLeaderboard.length === 0) {
            getLeaderboard().then(res => {
                if (res.success && res.leaderboard) {
                    setXpLeaderboard(res.leaderboard.map(l => ({
                        id: l.id,
                        name: l.name,
                        totalRaised: 0,
                        doorsKnocked: 0,
                        donationCount: 0,
                        lastActive: 0,
                        xp: l.xp,
                        level: l.level
                    })));
                }
            });
        }
    }, [metric]);

    // Calculate stats from apartments data
    const stats = useMemo(() => {
        const memberMap: Record<string, MemberStats> = {};

        apartments.forEach(apt => {
            Object.values(apt.rooms).flat().forEach((room: Room) => {
                // We only credit visiting/donating if 'collectedBy' is present
                // If not present, we fallback to 'enteredBy' or skip
                const userId = room.collectedBy || room.enteredBy;
                const userName = room.collectedByName || room.enteredByName || 'Unknown Volunteer';

                if (!userId) return;

                if (!memberMap[userId]) {
                    memberMap[userId] = {
                        id: userId,
                        name: userName,
                        totalRaised: 0,
                        doorsKnocked: 0,
                        donationCount: 0,
                        lastActive: 0
                    };
                }

                // Update stats
                if (room.updatedAt && room.updatedAt > memberMap[userId].lastActive) {
                    memberMap[userId].lastActive = room.updatedAt;
                }

                if (room.status !== 'unvisited') {
                    memberMap[userId].doorsKnocked++;
                }

                if (room.status === 'donated') {
                    memberMap[userId].donationCount++;
                    memberMap[userId].totalRaised += (room.amountDonated || 0);
                }
            });
        });

        return Object.values(memberMap);
    }, [apartments]);

    // Sort based on current metric
    const sortedStats = useMemo(() => {
        if (metric === 'xp') return xpLeaderboard;

        return [...stats].sort((a, b) => {
            if (metric === 'raised') return b.totalRaised - a.totalRaised;
            if (metric === 'doors') return b.doorsKnocked - a.doorsKnocked;
            if (metric === 'donations') return b.donationCount - a.donationCount;
            return 0;
        });
    }, [stats, metric, xpLeaderboard]);

    const top3 = sortedStats.slice(0, 3);
    const rest = sortedStats.slice(3);

    const getMetricValue = (stat: MemberStats) => {
        if (metric === 'raised') return `₹${stat.totalRaised.toLocaleString()}`;
        if (metric === 'doors') return `${stat.doorsKnocked} Doors`;
        if (metric === 'donations') return `${stat.donationCount} Donations`;
        if (metric === 'xp') return `${stat.xp} XP (Lvl ${stat.level})`;
    };

    const getMetricIcon = () => {
        if (metric === 'raised') return <TrendingUp size={16} />;
        if (metric === 'doors') return <Users size={16} />;
        if (metric === 'donations') return <Target size={16} />;
        if (metric === 'xp') return <Zap size={16} />;
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col items-center justify-center mb-8 text-center pt-8">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mb-4 rotate-3">
                    <Trophy size={32} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Team Leaderboard</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Recognizing the top performers making a difference in the community.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-10">
                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl flex gap-1">
                    {[
                        { id: 'raised', label: 'Total Raised', icon: TrendingUp },
                        { id: 'raised', label: 'Total Raised', icon: TrendingUp },
                        { id: 'doors', label: 'Doors Knocked', icon: Users },
                        { id: 'donations', label: 'Donations', icon: Target },
                        { id: 'xp', label: 'XP Level', icon: Zap },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setMetric(tab.id as LeaderboardMetric)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                                metric === tab.id
                                    ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 scale-105"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Podium for Top 3 */}
            {sortedStats.length > 0 ? (
                <div className="flex items-end justify-center mb-12 gap-4 px-4 h-64">
                    {/* Silver (2nd) */}
                    {top3[1] && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center w-1/3 max-w-[140px]"
                        >
                            <div className="mb-2 text-center">
                                <span className="font-bold text-slate-700 dark:text-slate-200 block truncate w-full">{top3[1].name}</span>
                                <span className="text-xs font-bold text-slate-500">{getMetricValue(top3[1])}</span>
                            </div>
                            <div className="w-full h-32 bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-t-2xl relative flex items-start justify-center pt-4 shadow-lg">
                                <Medal size={32} className="text-slate-500 drop-shadow-sm" />
                                <div className="absolute bottom-4 text-4xl font-black text-slate-400/50">2</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Gold (1st) */}
                    {top3[0] && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex flex-col items-center w-1/3 max-w-[160px] z-10 -mb-4"
                        >
                            <div className="mb-2 text-center relative">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                                    <Star size={24} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white text-lg block truncate w-full">{top3[0].name}</span>
                                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 py-0.5 px-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-full border border-yellow-100 dark:border-yellow-800">
                                    {getMetricValue(top3[0])}
                                </span>
                            </div>
                            <div className="w-full h-44 bg-gradient-to-t from-yellow-400 to-amber-300 dark:from-yellow-600 dark:to-amber-500 rounded-t-2xl relative flex items-start justify-center pt-6 shadow-xl shadow-yellow-200 dark:shadow-yellow-900/20">
                                <Trophy size={40} className="text-yellow-800 dark:text-white drop-shadow-md" />
                                <div className="absolute bottom-4 text-5xl font-black text-white/50">1</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Bronze (3rd) */}
                    {top3[2] && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center w-1/3 max-w-[140px]"
                        >
                            <div className="mb-2 text-center">
                                <span className="font-bold text-slate-700 dark:text-slate-200 block truncate w-full">{top3[2].name}</span>
                                <span className="text-xs font-bold text-slate-500">{getMetricValue(top3[2])}</span>
                            </div>
                            <div className="w-full h-24 bg-gradient-to-t from-orange-300 to-orange-200 dark:from-orange-800 dark:to-orange-700 rounded-t-2xl relative flex items-start justify-center pt-4 shadow-lg">
                                <Medal size={32} className="text-orange-700 dark:text-orange-300 drop-shadow-sm" />
                                <div className="absolute bottom-4 text-4xl font-black text-orange-900/20 dark:text-orange-100/20">3</div>
                            </div>
                        </motion.div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-10">
                    <p className="text-slate-500">No data available yet. Start campaign activities!</p>
                </div>
            )}

            {/* List for Rest */}
            {rest.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {rest.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center p-4 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="w-8 text-center font-bold text-slate-400 mr-4">
                                {index + 4}
                            </div>
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mr-4">
                                <span className="font-bold text-slate-500 dark:text-slate-400">
                                    {member.name.charAt(0)}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 dark:text-white">{member.name}</h4>
                                <div className="flex gap-3 text-xs text-slate-400">
                                    <span className={metric === 'doors' ? 'text-blue-600 font-bold' : ''}>{member.doorsKnocked} doors</span>
                                    <span>•</span>
                                    <span className={metric === 'donations' ? 'text-blue-600 font-bold' : ''}>{member.donationCount} donations</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-bold ${metric === 'raised' ? 'text-green-600 dark:text-green-400 text-lg' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {getMetricValue(member)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
