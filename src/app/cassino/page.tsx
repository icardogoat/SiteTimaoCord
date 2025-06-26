'use server';

import { AppLayout } from '@/components/app-layout';
import { CassinoGameClient } from '@/components/cassino-game-client';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import type { StandingTeam } from '@/types';

async function getTeams(): Promise<StandingTeam[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const standingsCollection = db.collection('standings');

        const pipeline = [
            { $unwind: "$standings" },
            { $unwind: "$standings" },
            { $project: {
                _id: 0,
                id: "$standings.team.id",
                name: "$standings.team.name",
                logo: "$standings.team.logo",
            }},
            { $group: {
                _id: "$id",
                name: { $first: "$name" },
                logo: { $first: "$logo" },
            }},
            { $project: {
                _id: 0,
                id: "$_id",
                name: "$name",
                logo: "$logo",
            }}
        ];

        const teams = await standingsCollection.aggregate(pipeline).toArray();

        // Add a default team in case the DB is empty
        if (teams.length === 0) {
            return [{ id: 0, name: 'FielBet FC', logo: 'https://placehold.co/64x64.png' }];
        }
        
        return teams as StandingTeam[];

    } catch (error) {
        console.error('Error fetching teams for cassino:', error);
        return [{ id: 0, name: 'FielBet FC', logo: 'https://placehold.co/64x64.png' }];
    }
}


export default async function CassinoPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }
    
    const [availableLeagues, teams] = await Promise.all([
        getAvailableLeagues(),
        getTeams()
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <CassinoGameClient teams={teams} />
        </AppLayout>
    );
}
