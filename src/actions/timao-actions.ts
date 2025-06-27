'use server';

import clientPromise from '@/lib/mongodb';
import type { Match } from '@/types';
import { translateMarketData } from '@/lib/translations';
import { getAvailableApiKey } from './settings-actions';

export type PlayerStat = {
    id: number;
    name: string;
    photo: string;
    position: string;
    appearences: number;
    goals: number;
    assists: number | null;
};

export type TimaoData = {
    upcomingMatches: Match[];
    recentMatches: Match[];
    stats: {
        totalMatches: number;
        wins: number;
        draws: number;
        losses: number;
    };
    topPlayers: PlayerStat[];
};

// Type for a match from the database
type DbMatch = {
  _id: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  league: string;
  timestamp: number;
  isFinished: boolean;
  markets: {
    name: string;
    odds: { label: string; value: string }[];
  }[];
  status: string;
  goals: {
    home: number | null;
    away: number | null;
  };
  teams?: {
      home: { id: number; winner: boolean | null; };
      away: { id: number; winner: boolean | null; };
  }
};

const formatDbMatch = (dbMatch: DbMatch): Match => {
    const date = new Date(dbMatch.timestamp * 1000);
    const timeZone = 'America/Sao_Paulo';
    const timeString = date.toLocaleString('pt-BR', { timeZone, dateStyle: 'short', timeStyle: 'short' });
    const translatedMarkets = dbMatch.markets.map(translateMarketData);

    return {
        id: dbMatch._id,
        teamA: {
          name: dbMatch.homeTeam,
          logo: dbMatch.homeLogo || 'https://placehold.co/40x40.png',
        },
        teamB: {
          name: dbMatch.awayTeam,
          logo: dbMatch.awayLogo || 'https://placehold.co/40x40.png',
        },
        time: timeString,
        league: dbMatch.league,
        markets: translatedMarkets,
        status: dbMatch.status,
        goals: dbMatch.goals,
        isFinished: dbMatch.isFinished,
        timestamp: dbMatch.timestamp,
      };
}

async function getCorinthiansPlayerStats(): Promise<PlayerStat[]> {
    const teamId = 127; // Corinthians ID
    const season = new Date().getFullYear();

    let apiKey;
    try {
        apiKey = await getAvailableApiKey();
    } catch (error) {
        console.error("Could not get API key for player stats:", error);
        return [];
    }
    
    const url = `https://api-football-v1.p.rapidapi.com/v3/players?team=${teamId}&season=${season}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error(`API Error fetching player stats for team ${teamId}:`, await response.text());
            return [];
        }

        const data = await response.json();
        if (!data.response || data.response.length === 0) {
            return [];
        }
        
        const playerStats: PlayerStat[] = data.response.map((item: any) => {
            const mainLeagueStats = item.statistics.find((stat: any) => stat.league.name === 'Brasileirão Série A' || stat.league.name === 'Serie A') || item.statistics[0];
            
            if (!mainLeagueStats || !mainLeagueStats.games.appearences) return null;

            return {
                id: item.player.id,
                name: item.player.name,
                photo: item.player.photo,
                position: mainLeagueStats.games.position,
                appearences: mainLeagueStats.games.appearences || 0,
                goals: mainLeagueStats.goals.total || 0,
                assists: mainLeagueStats.goals.assists,
            };
        }).filter((p: PlayerStat | null): p is PlayerStat => p !== null && p.appearences > 0);
        
        return playerStats.sort((a, b) => {
            if (b.goals !== a.goals) {
                return b.goals - a.goals;
            }
            return b.appearences - a.appearences;
        });

    } catch (error) {
        console.error('Failed to fetch player stats:', error);
        return [];
    }
}


export async function getTimaoData(): Promise<TimaoData> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection<DbMatch>('matches');

        const teamName = 'Corinthians';
        const nowTimestamp = Math.floor(Date.now() / 1000);

        const [allMatches, topPlayers] = await Promise.all([
             matchesCollection.find({
                $or: [{ homeTeam: teamName }, { awayTeam: teamName }]
            }).toArray(),
            getCorinthiansPlayerStats()
        ]);
        
        const upcomingMatchesDb = allMatches
            .filter(m => m.timestamp >= nowTimestamp)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(0, 5);
        
        const recentMatchesDb = allMatches
            .filter(m => m.timestamp < nowTimestamp)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        // Calculate stats from recent matches
        let wins = 0;
        let draws = 0;
        let losses = 0;

        recentMatchesDb.forEach(match => {
            if (match.goals.home === null || match.goals.away === null || !match.teams) {
                return;
            };

            const isHomeTeam = match.homeTeam === teamName;
            const winner = match.teams.home.winner === true ? 'home' : match.teams.away.winner === true ? 'away' : 'draw';
            
            if ((winner === 'home' && isHomeTeam) || (winner === 'away' && !isHomeTeam)) {
                wins++;
            } else if ((winner === 'home' && !isHomeTeam) || (winner === 'away' && isHomeTeam)) {
                losses++;
            } else {
                draws++;
            }
        });

        return {
            upcomingMatches: upcomingMatchesDb.map(formatDbMatch),
            recentMatches: recentMatchesDb.map(formatDbMatch),
            stats: {
                totalMatches: allMatches.length,
                wins,
                draws,
                losses
            },
            topPlayers
        };
    } catch (error) {
        console.error('Error fetching Timão data:', error);
        return {
            upcomingMatches: [],
            recentMatches: [],
            stats: { totalMatches: 0, wins: 0, draws: 0, losses: 0 },
            topPlayers: []
        };
    }
}
