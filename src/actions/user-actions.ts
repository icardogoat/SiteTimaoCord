
'use server';

import clientPromise from '@/lib/mongodb';
import type { UserRanking, ActiveBettorRanking, TopLevelUserRanking, PlacedBet, UserLevel, RichestUserRanking, InviterRanking } from '@/types';
import type { WithId } from 'mongodb';
import { cache } from 'react';

export interface UserStats {
    totalWagered: number;
    totalBets: number;
    totalWinnings: number;
    totalLosses: number;
    betsWon: number;
    betsLost: number;
}

export const getUserStats = cache(async (userId: string): Promise<UserStats> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection<WithId<PlacedBet>>('bets');

        const userBets = await betsCollection.find({ userId }).toArray();

        if (userBets.length === 0) {
            return { totalWagered: 0, totalBets: 0, totalWinnings: 0, totalLosses: 0, betsWon: 0, betsLost: 0 };
        }

        const totalBets = userBets.length;
        const totalWagered = userBets.reduce((sum, bet) => sum + bet.stake, 0);

        const wonBets = userBets.filter(bet => bet.status === 'Ganha');
        const lostBets = userBets.filter(bet => bet.status === 'Perdida');

        const totalWinnings = wonBets.reduce((sum, bet) => sum + bet.potentialWinnings, 0);
        const totalLosses = lostBets.reduce((sum, bet) => sum + bet.stake, 0);
        const betsWon = wonBets.length;
        const betsLost = lostBets.length;

        return { totalWagered, totalBets, totalWinnings, totalLosses, betsWon, betsLost };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { totalWagered: 0, totalBets: 0, totalWinnings: 0, totalLosses: 0, betsWon: 0, betsLost: 0 };
    }
});

export const getTopWinners = cache(async (): Promise<UserRanking[]> => {
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
            { $limit: 50 },
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
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    winnings: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            discordId: user.discordId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            winnings: user.winnings as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top winners:', error);
        return [];
    }
});

export const getMostActiveBettors = cache(async (): Promise<ActiveBettorRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');

        const rankingsData = await betsCollection.aggregate([
            {
                $group: {
                    _id: '$userId',
                    totalBets: { $sum: 1 }
                }
            },
            { $sort: { totalBets: -1 } },
            { $limit: 50 },
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
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    totalBets: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            discordId: user.discordId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            totalBets: user.totalBets as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching most active bettors:', error);
        return [];
    }
});

export const getTopLevelUsers = cache(async (): Promise<TopLevelUserRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');

        const rankingsData = await usersCollection.find({})
            .sort({ xp: -1 })
            .limit(50)
            .toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            name: user.name as string,
            avatar: user.image as string,
            level: user.level ?? 1,
            xp: user.xp ?? 0,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top level users:', error);
        return [];
    }
});

export const getRichestUsers = cache(async (): Promise<RichestUserRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const walletsCollection = db.collection('wallets');

        const rankingsData = await walletsCollection.aggregate([
            { $sort: { balance: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    balance: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData
            .filter(user => user.name)
            .map((user, index) => ({
                rank: index + 1,
                discordId: user.discordId as string,
                name: user.name as string,
                avatar: user.avatar as string,
                balance: user.balance as number,
                isVip: user.isVip as boolean ?? false,
            }));

    } catch (error) {
        console.error('Error fetching richest users:', error);
        return [];
    }
});


const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0 },
    { level: 2, xp: 500 },
    { level: 3, xp: 1500 },
    { level: 4, xp: 3000 },
    { level: 5, xp: 5000 },
    { level: 6, xp: 10000 },
    { level: 7, xp: 20000 },
    { level: 8, xp: 40000 },
    { level: 9, xp: 75000 },
    { level: 10, xp: 150000 },
];

export const getUserLevel = cache(async (userId: string): Promise<UserLevel> => {
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
});

export const getTopInviters = cache(async (): Promise<InviterRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const invitesCollection = db.collection('invites');

        const rankingsData = await invitesCollection.aggregate([
            {
                $group: {
                    _id: '$inviterId',
                    inviteCount: { $sum: 1 }
                }
            },
            { $sort: { inviteCount: -1 } },
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
                    inviterId: '$_id',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    inviteCount: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            inviterId: user.inviterId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            inviteCount: user.inviteCount as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top inviters:', error);
        return [];
    }
});
