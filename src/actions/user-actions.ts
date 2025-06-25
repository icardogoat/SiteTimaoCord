'use server';

import clientPromise from '@/lib/mongodb';
import type { UserRanking, PlacedBet } from '@/types';
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
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            name: user.name as string,
            avatar: user.avatar as string,
            winnings: user.winnings as number,
        }));

    } catch (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }
}
