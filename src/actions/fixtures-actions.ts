
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
async function fetchFixturesByLeagueAndDate(leagueId: number, season: number, date: string) {
    const apiKey = await getAvailableUpdateApiKey();
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&date=${date}`;
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
        const errorData = await response.json().catch(() => ({}));
        console.error(`API error fetching fixtures for league ${leagueId} on ${date}: ${response.statusText}`, errorData);
        // Don't throw, just return empty array to not halt the entire process for one league.
        return []; 
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
    const championshipsCollection = db.collection('championships');

    const activeChampionships = await championshipsCollection.find({ isActive: true }).toArray();

    if (activeChampionships.length === 0) {
        const msg = 'No active championships configured. Skipping fixture update.';
        console.log(msg);
        return { success: true, message: msg };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    try {
        let allFixtures: ApiFixture[] = [];

        for (const champ of activeChampionships) {
            try {
                const [todayFixtures, tomorrowFixtures] = await Promise.all([
                    fetchFixturesByLeagueAndDate(champ.leagueId, champ.season, today),
                    fetchFixturesByLeagueAndDate(champ.leagueId, champ.season, tomorrow)
                ]);
                allFixtures.push(...todayFixtures, ...tomorrowFixtures);

                // Auto-update logo and country if missing
                const firstFixture = todayFixtures[0] || tomorrowFixtures[0];
                if (firstFixture && (!champ.logo || !champ.country)) {
                    await championshipsCollection.updateOne(
                        { _id: champ._id },
                        { $set: { 
                            logo: firstFixture.league.logo,
                            country: firstFixture.league.country,
                        }}
                    );
                }
            } catch (e) {
                console.error(`Failed to process fixtures for league ${champ.name} (${champ.leagueId}):`, e);
            }
        }

        console.log(`Found ${allFixtures.length} total fixtures for active championships.`);

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
