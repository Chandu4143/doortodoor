
import React, { useEffect, useState } from 'react';
import { Trophy, Target, Star, CheckCircle2, Flame, CalendarDays } from 'lucide-react';
import { cn } from '../utils/cn';
import { getDailyChallenges, type DailyChallenge } from '../services/supabase/gamificationService';
import { useAuth } from '../contexts/AuthContext';

export default function DailyChallengesUI() {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        loadChallenges();
    }, [user]);

    const loadChallenges = async () => {
        try {
            const { success, challenges } = await getDailyChallenges();
            if (success && challenges) {
                setChallenges(challenges);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />;
    }

    // Interactive Confetti Effect on Completion could be added here

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Trophy className="text-amber-500" size={20} />
                        Daily Quests
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Complete tasks to earn XP & Rewards</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-900/50">
                    <Flame size={12} fill="currentColor" />
                    <span>Streak: 3 Days</span> {/* TODO: hook up to real streak */}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {challenges.map((challenge) => {
                    const progress = Math.min(100, (challenge.current / challenge.target) * 100);
                    const isCompleted = challenge.current >= challenge.target;

                    return (
                        <div
                            key={challenge.id}
                            className={cn(
                                "relative p-4 rounded-xl border transition-all duration-300",
                                isCompleted
                                    ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30"
                                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800"
                            )}
                        >
                            {isCompleted && (
                                <div className="absolute top-3 right-3 text-green-500 animate-in zoom-in spin-in-12">
                                    <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-green-900" />
                                </div>
                            )}

                            <div className="flex items-start gap-3 mb-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm",
                                    isCompleted ? "bg-white dark:bg-green-900/30" : "bg-white dark:bg-slate-800"
                                )}>
                                    {challenge.challenge_type === 'visits' && '🚪'}
                                    {challenge.challenge_type === 'donations' && '💰'}
                                    {challenge.challenge_type === 'callbacks' && '📅'}
                                    {challenge.challenge_type === 'forms' && '📝'}
                                </div>
                                <div>
                                    <h3 className={cn(
                                        "font-bold text-sm",
                                        isCompleted ? "text-green-800 dark:text-green-300" : "text-slate-700 dark:text-slate-200"
                                    )}>
                                        {challenge.title}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-0.5">
                                        <Star size={10} fill="currentColor" />
                                        +{challenge.xp_reward} XP
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                                    <span className={isCompleted ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"}>
                                        {challenge.current} / {challenge.target}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out",
                                            isCompleted ? "bg-green-500" : "bg-blue-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {challenges.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CalendarDays className="mx-auto mb-2 opacity-50" />
                        No challenges active for today. Check back tomorrow!
                    </div>
                )}
            </div>
        </div>
    );
}
