
import { supabase } from './client';

export type ChallengeType = 'visits' | 'donations' | 'forms' | 'callbacks';

export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    challenge_type: ChallengeType;
    target: number;
    current: number;
    xp_reward: number;
    completed_at?: string;
    expires_at: string;
}

export interface UserXP {
    total_xp: number;
    level: number;
}

/**
 * Gets or generates daily challenges for the user
 */
export async function getDailyChallenges(): Promise<{ success: boolean; challenges?: DailyChallenge[]; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString();

        // Fetch existing active challenges
        const { data: existing, error } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('user_id', user.id)
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;

        if (existing && existing.length > 0) {
            return { success: true, challenges: existing as DailyChallenge[] };
        }

        // Generate new challenges if none exist
        // simplified generation logic
        const newChallenges = [
            {
                user_id: user.id,
                challenge_type: 'visits',
                title: 'Door Opener',
                description: 'Visit 10 households today',
                target: 10,
                current: 0,
                xp_reward: 100,
                expires_at: tomorrow
            },
            {
                user_id: user.id,
                challenge_type: 'donations',
                title: 'First Win',
                description: 'Secure 1 donation',
                target: 1,
                current: 0,
                xp_reward: 200,
                expires_at: tomorrow
            }
        ];

        const { data: created, error: createError } = await supabase
            .from('daily_challenges')
            .insert(newChallenges)
            .select();

        if (createError) throw createError;

        return { success: true, challenges: created as DailyChallenge[] };

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get challenges';
        return { success: false, error: message };
    }
}

/**
 * Updates challenge progress based on activity
 */
export async function updateChallengeProgress(
    type: ChallengeType,
    amount: number = 1
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch active challenges of this type
        const { data: challenges } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('user_id', user.id)
            .eq('challenge_type', type)
            .is('completed_at', null)
            .gt('expires_at', new Date().toISOString());

        if (!challenges) return;

        for (const challenge of challenges) {
            const newCurrent = (challenge.current || 0) + amount;
            const completed = newCurrent >= challenge.target;

            const updates: any = { current: newCurrent };
            if (completed) {
                updates.completed_at = new Date().toISOString();
                // Award XP
                await awardXP(user.id, challenge.xp_reward);
            }

            await supabase
                .from('daily_challenges')
                .update(updates)
                .eq('id', challenge.id);
        }

    } catch (e) {
        console.error("Failed to update challenge progress", e);
    }
}

async function awardXP(userId: string, amount: number) {
    // Upsert XP
    // This requires a bit of logic to handle level ups, simplified here
    const { data } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', userId)
        .single();

    const currentXP = data?.total_xp || 0;
    const currentLevel = data?.level || 1;
    const newXP = currentXP + amount;
    // Simple level formula: level * 1000
    const newLevel = Math.floor(newXP / 1000) + 1;

    if (data) {
        await supabase.from('user_xp').update({ total_xp: newXP, level: newLevel }).eq('user_id', userId);
    } else {
        await supabase.from('user_xp').insert({ user_id: userId, total_xp: newXP, level: newLevel });
    }
}

/**
 * Get global leaderboard based on XP
 */
export async function getLeaderboard(limit = 10): Promise<{ success: boolean; leaderboard?: any[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('user_xp')
            .select(`
                total_xp,
                level,
                user_id,
                profiles:user_id (
                    name,
                    avatar_url
                )
            `)
            .order('total_xp', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Flatten structure
        const formatted = data.map((entry: any) => ({
            id: entry.user_id,
            name: entry.profiles?.name || 'Unknown',
            avatar: entry.profiles?.avatar_url,
            xp: entry.total_xp,
            level: entry.level
        }));

        return { success: true, leaderboard: formatted };
    } catch (err) {
        return { success: false, error: 'Failed to fetch leaderboard' };
    }
}
/**
 * Get specific user's XP and Level
 */
export async function getUserXP(userId: string): Promise<{ success: boolean; xp?: UserXP; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('user_xp')
            .select('daily_challenges, total_xp, level') // daily_challenges is likely not a column here, removing it
            // actually columns are: id, user_id, total_xp, level
            .select('total_xp, level')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Not found
                return { success: true, xp: { total_xp: 0, level: 1 } };
            }
            throw error;
        }

        return { success: true, xp: data as UserXP };
    } catch (err) {
        return { success: false, error: 'Failed to fetch user XP' };
    }
}
