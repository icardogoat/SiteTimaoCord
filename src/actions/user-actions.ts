
'use server';

import clientPromise from '@/lib/mongodb';
import type { UserRanking, PlacedBet, UserLevel } from '@/types';
import type { WithId } from 'mongodb';

export interface UserStats {
    totalWagered: number;
    totalBets: number;
    totalWinnings: number;
    totalLosses: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection<WithId<PlacedBet>>('bets');

        const userBets = await betsCollection.find({ userId }).toArray();

        if (userBets.length === 0) {
            return { totalWagered: 0, totalBets: 0, totalWinnings: 0, totalLosses: 0 };
        }

        const totalBets = userBets.length;
        const totalWagered = userBets.reduce((sum, bet) => sum + bet.stake, 0);

        const totalWinnings = userBets
            .filter(bet => bet.status === 'Ganha')
            .reduce((sum, bet) => sum + bet.potentialWinnings, 0);

        const totalLosses = userBets
            .filter(bet => bet.status === 'Perdida')
            .reduce((sum, bet) => sum + bet.stake, 0);

        return { totalWagered, totalBets, totalWinnings, totalLosses };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { totalWagered: 0, totalBets: 0, totalWinnings: 0, totalLosses: 0 };
    }
}

export async function getRankings(): Promise<UserRanking[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');

        const rankingsData = await betsCollection.aggregate([
            { $match: { status: 'Ganha' } },
            {
                $group: {
                    _id: '$userId',
                    winnings: { $sum: '$potentialWinnings' }
                }
            },
            { $sort: { winnings: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    winnings: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            name: user.name as string,
            avatar: user.avatar as string,
            winnings: user.winnings as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }
}

const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 500 },
    { level: 4, xp: 1000 },
    { level: 5, xp: 2500 },
    { level: 6, xp: 5000 },
    { level: 7, xp: 10000 },
    { level: 8, xp: 20000 },
    { level: 9, xp: 50000 },
    { level: 10, xp: 100000 },
];

export async function getUserLevel(userId: string): Promise<UserLevel> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ discordId: userId });

        const xp = user?.xp ?? 0;

        let currentLevel = 1;
        let xpForNextLevel = LEVEL_THRESHOLDS[1]?.xp ?? Infinity;
        let xpForCurrentLevel = 0;

        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= LEVEL_THRESHOLDS[i].xp) {
                currentLevel = LEVEL_THRESHOLDS[i].level;
                xpForCurrentLevel = LEVEL_THRESHOLDS[i].xp;
                xpForNextLevel = LEVEL_THRESHOLDS[i + 1]?.xp ?? LEVEL_THRESHOLDS[i].xp;
                break;
            }
        }
        
        // Self-correcting: if the level in DB is not correct, update it.
        if (user && user.level !== currentLevel) {
            await usersCollection.updateOne({ _id: user._id }, { $set: { level: currentLevel } });
        }

        if (currentLevel === LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level) {
            xpForNextLevel = xpForCurrentLevel;
        }

        const xpInCurrentLevel = xp - xpForCurrentLevel;
        const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
        
        const progress = xpNeededForNextLevel > 0 ? Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100) : 100;

        return {
            level: currentLevel,
            xp,
            xpForNextLevel: xpForNextLevel,
            progress: Math.min(progress, 100),
        };
    } catch (error) {
        console.error(`Error fetching user level for ${userId}:`, error);
        return { level: 1, xp: 0, xpForNextLevel: LEVEL_THRESHOLDS[1]?.xp ?? 100, progress: 0 };
    }
}
