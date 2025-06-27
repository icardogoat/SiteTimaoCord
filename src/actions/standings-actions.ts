
'use server';

import clientPromise from '@/lib/mongodb';
import type { Standing } from '@/types';
import type { WithId } from 'mongodb';
import { getApiSettings } from './settings-actions';

export async function getStandings(): Promise<Standing[]> {
    try {
        const { standingsConfig } = await getApiSettings();
        const activeLeagueIds = standingsConfig
            ?.filter(c => c.isActive)
            ?.map(c => c.leagueId) || [];

        if (activeLeagueIds.length === 0) {
            return [];
        }

        const client = await clientPromise;
        const db = client.db('timaocord');
        const standingsCollection = db.collection<WithId<Standing>>('standings');

        const standingsData = await standingsCollection
            .find({ 'league.id': { $in: activeLeagueIds } })
            .toArray();

        if (!standingsData) {
            return [];
        }
        
        const processedStandings = standingsData.map(s => ({
            ...s,
            _id: s._id.toString(),
        }));
        
        const leagueOrder = [
            'Brasileirão Série A',
            'Brasileirão Série B',
            'Copa do Brasil',
            'CONMEBOL Libertadores',
            'CONMEBOL Sul-Americana',
            'UEFA Champions League',
            'Premier League',
            'La Liga',
            'Serie A',
            'Bundesliga',
            'Ligue 1',
            'MLS',
            'FIFA Club World Cup',
            'Mundial de Clubes da FIFA',
            'UEFA Europa League',
        ];

        const getOrder = (leagueName: string) => {
            const index = leagueOrder.indexOf(leagueName);
            return index === -1 ? Infinity : index;
        };
        
        processedStandings.sort((a, b) => {
            return getOrder(a.league.name) - getOrder(b.league.name);
        });

        return JSON.parse(JSON.stringify(processedStandings));
    } catch (error) {
        console.error('Error fetching standings:', error);
        return [];
    }
}
