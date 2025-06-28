
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { translateMarketData } from '@/lib/translations';
import { getAvailableUpdateApiKey, setLastUpdateTimestamp } from './settings-actions';
import type { Market } from '@/types';

// Simplified types for API response
interface ApiFixture {
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiOdd {
    id: number;
    name: string;
    values: { value: string; odd: string }[];
}

// Function to fetch fixtures for a given date from the external API
async function fetchFixturesByDate(date: string) {
    const apiKey = await getAvailableUpdateApiKey();
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${date}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`API error fetching fixtures for ${date}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.response as ApiFixture[];
}

// Function to fetch odds for a given fixture ID
async function fetchOddsByFixtureId(fixtureId: number): Promise<Market[]> {
    const apiKey = await getAvailableUpdateApiKey();
    const url = `https://api-football-v1.p.rapidapi.com/v3/odds?fixture=${fixtureId}`;
     const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };
    const response = await fetch(url, options);
    if (!response.ok) {
        console.warn(`Could not fetch odds for fixture ${fixtureId}: ${response.statusText}`);
        return []; // Return empty array if odds aren't available
    }
    const data = await response.json();
    if (!data.response || data.response.length === 0) return [];
    
    // We only care about the main bookmaker (Bet365 ID=8) for consistency
    const bookmaker = data.response[0].bookmakers.find((b: any) => b.id === 8);
    if (!bookmaker) return [];
    
    const markets: Market[] = bookmaker.bets.map((bet: ApiOdd) => ({
        name: bet.name,
        odds: bet.values.map(v => ({ label: v.value, value: v.odd }))
    }));
    
    return markets.map(translateMarketData);
}

// The main function to be called by the cron job
export async function updateFixturesFromApi() {
    console.log('Starting fixture update process...');
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection('matches');
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    try {
        const [todayFixtures, tomorrowFixtures] = await Promise.all([
            fetchFixturesByDate(today),
            fetchFixturesByDate(tomorrow)
        ]);

        const allFixtures = [...todayFixtures, ...tomorrowFixtures];
        console.log(`Found ${allFixtures.length} total fixtures for today and tomorrow.`);

        let updatedCount = 0;
        let newCount = 0;

        for (const fixture of allFixtures) {
            // Only process matches that haven't started or are live
            const nonProcessableStatus = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];
            if (nonProcessableStatus.includes(fixture.fixture.status.short)) {
                continue;
            }

            const odds = await fetchOddsByFixtureId(fixture.fixture.id);
            // Skip matches with no odds, as they are not bettable
            if (odds.length === 0) {
                continue;
            }

            const matchDocument = {
                _id: fixture.fixture.id,
                homeTeam: fixture.teams.home.name,
                homeLogo: fixture.teams.home.logo,
                awayTeam: fixture.teams.away.name,
                awayLogo: fixture.teams.away.logo,
                league: fixture.league.name,
                timestamp: fixture.fixture.timestamp,
                status: fixture.fixture.status.short,
                goals: fixture.goals,
                isFinished: false,
                markets: odds
            };

            const result = await matchesCollection.updateOne(
                { _id: fixture.fixture.id },
                { $set: matchDocument },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                newCount++;
            } else if (result.modifiedCount > 0) {
                updatedCount++;
            }
        }
        
        await setLastUpdateTimestamp();
        
        const message = `Fixture update complete. New: ${newCount}, Updated: ${updatedCount}.`;
        console.log(message);
        revalidatePath('/bet'); // Revalidate the main betting page
        return { success: true, message };

    } catch (error) {
        console.error('An error occurred during fixture update:', error);
        return { success: false, message: (error as Error).message };
    }
}
