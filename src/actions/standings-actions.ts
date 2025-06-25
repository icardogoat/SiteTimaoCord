'use server';

import clientPromise from '@/lib/mongodb';
import type { Standing } from '@/types';
import type { WithId } from 'mongodb';

const relevantLeagues = [
    'Brasileirão Série A',
    'CONMEBOL Libertadores',
    'CONMEBOL Sul-Americana',
];

export async function getStandings(): Promise<Standing[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const standingsCollection = db.collection<WithId<Standing>>('standings');

        const standingsData = await standingsCollection
            .find({ 'league.name': { $in: relevantLeagues } })
            .toArray();

        if (!standingsData) {
            return [];
        }
        
        const processedStandings = standingsData.map(s => ({
            ...s,
            _id: s._id.toString(),
        }));
        
        processedStandings.sort((a, b) => {
            if (a.league.name === 'Brasileirão Série A') return -1;
            if (b.league.name === 'Brasileirão Série A') return 1;
            return a.league.name.localeCompare(b.league.name);
        });

        return JSON.parse(JSON.stringify(processedStandings));
    } catch (error) {
        console.error('Error fetching standings:', error);
        return [];
    }
}
