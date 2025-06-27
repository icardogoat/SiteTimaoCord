'use server';

import clientPromise from '@/lib/mongodb';
import type { Match } from '@/types';
import { translateMarketData } from '@/lib/translations';

export type TimaoData = {
    upcomingMatches: Match[];
    recentMatches: Match[];
    stats: {
        totalMatches: number;
        wins: number;
        draws: number;
        losses: number;
    };
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

export async function getTimaoData(): Promise<TimaoData> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection<DbMatch>('matches');

        const teamName = 'Corinthians';
        const nowTimestamp = Math.floor(Date.now() / 1000);

        const allMatchesCursor = matchesCollection.find({
            $or: [{ homeTeam: teamName }, { awayTeam: teamName }]
        });
        
        const allMatches = await allMatchesCursor.toArray();

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
                // If score is null or teams data is missing, we can't determine winner, so we can count it as a draw or skip.
                // Skipping seems more accurate.
                return;
            };

            const isHomeTeam = match.homeTeam === teamName;
            const winner = match.teams.home.winner === true ? 'home' : match.teams.away.winner === true ? 'away' : 'draw';
            
            if ((winner === 'home' && isHomeTeam) || (winner === 'away' && !isHomeTeam)) {
                wins++;
            } else if ((winner === 'home' && !isHomeTeam) || (winner === 'away' && isHomeTeam)) {
                losses++;
            } else { // Draw or null winner property
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
            }
        };
    } catch (error) {
        console.error('Error fetching Timão data:', error);
        return {
            upcomingMatches: [],
            recentMatches: [],
            stats: { totalMatches: 0, wins: 0, draws: 0, losses: 0 }
        };
    }
}
