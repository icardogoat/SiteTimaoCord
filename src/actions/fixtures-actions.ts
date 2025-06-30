
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

// Function to fetch odds for a given league and date
async function fetchOddsByLeagueAndDate(leagueId: number, season: number, date: string) {
    const apiKey = await getAvailableUpdateApiKey();
    const url = `https://api-football-v1.p.rapidapi.com/v3/odds?league=${leagueId}&season=${season}&date=${date}&bookmaker=8`;
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
        console.warn(`Could not fetch odds for league ${leagueId} on ${date}: ${response.statusText}`, errorData);
        return [];
    }
    const data = await response.json();
    return data.response; // This is an array of odds objects, each for a different fixture
}

// The main function to be called by the cron job
export async function updateFixturesFromApi() {
    console.log('Starting optimized fixture update process...');
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
    const dates = [today, tomorrow];
    
    let updatedCount = 0;
    let newCount = 0;

    for (const champ of activeChampionships) {
        for (const date of dates) {
            try {
                // Fetch fixtures and odds concurrently for the same league and date
                const [fixturesResponse, oddsResponse] = await Promise.all([
                    fetchFixturesByLeagueAndDate(champ.leagueId, champ.season, date),
                    fetchOddsByLeagueAndDate(champ.leagueId, champ.season, date)
                ]);
                
                // If there are no odds, there's nothing to bet on. Skip this batch.
                if (!oddsResponse || oddsResponse.length === 0) {
                    continue;
                }

                const fixturesMap = new Map(fixturesResponse.map(f => [f.fixture.id, f]));
                
                const firstFixture = fixturesResponse[0];
                if (firstFixture && (!champ.logo || !champ.country)) {
                     await championshipsCollection.updateOne(
                        { _id: champ._id },
                        { $set: { 
                            logo: firstFixture.league.logo,
                            country: firstFixture.league.country,
                        }}
                    );
                }
                
                for (const oddData of oddsResponse) {
                    const fixture = fixturesMap.get(oddData.fixture.id);
                    
                    if (!fixture || ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(fixture.fixture.status.short)) {
                        continue;
                    }
                    
                    const bookmaker = oddData.bookmakers.find((b: any) => b.id === 8);
                    if (!bookmaker) continue;

                    const markets: Market[] = bookmaker.bets.map((bet: ApiOdd) => ({
                        name: bet.name,
                        odds: bet.values.map(v => ({ label: v.value, value: v.odd }))
                    })).map(translateMarketData);

                    if (markets.length === 0) continue;

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
                        markets: markets
                    };
                    
                    const result = await matchesCollection.updateOne(
                        { _id: fixture.fixture.id },
                        { $set: matchDocument },
                        { upsert: true }
                    );

                    if (result.upsertedCount > 0) newCount++;
                    else if (result.modifiedCount > 0) updatedCount++;
                }

            } catch (e) {
                 console.error(`Failed to process fixtures for league ${champ.name} (${champ.leagueId}) on ${date}:`, e);
            }
        }
    }

    await setLastUpdateTimestamp();
    
    const message = `Optimized fixture update complete. New: ${newCount}, Updated: ${updatedCount}.`;
    console.log(message);
    revalidatePath('/bet');
    return { success: true, message };
}
