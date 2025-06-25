'use server';

import { BetPageClient } from '@/components/bet-page-client';
import clientPromise from '@/lib/mongodb';
import { translateMarketData } from '@/lib/translations';
import type { Match } from '@/types';

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
};

async function getMatches(): Promise<{ matches: Match[]; availableLeagues: string[] }> {
  try {
    const client = await clientPromise;
    const db = client.db("timaocord");
    const matchesCollection = db.collection<DbMatch>("matches");

    const timeZone = 'America/Sao_Paulo';

    // Get the current date in Brasília time zone to correctly define "today".
    const nowInBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone }));
    
    // Get the start of today in Brasília time.
    const start = new Date(nowInBrasilia);
    start.setHours(0, 0, 0, 0);

    // Get the end of tomorrow in Brasília time.
    const end = new Date(nowInBrasilia);
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);

    // .getTime() is always UTC-based, so this gives us the correct timestamp range for the query.
    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    const dbMatches = await matchesCollection
      .find({
        timestamp: { $gte: startTimestamp, $lte: endTimestamp },
      })
      .toArray();

    // Get unique leagues from today's matches
    const availableLeagues = [...new Set(dbMatches.map(m => m.league))];

    // Sort to show upcoming matches first, then finished matches.
    // Within each group, sort by time.
    dbMatches.sort((a, b) => {
        if (a.isFinished !== b.isFinished) {
            return a.isFinished ? 1 : -1; // false (not finished) comes first
        }
        return a.timestamp - b.timestamp; // Then sort by time
    });
    
    // Get date parts for today and tomorrow in Brasília time for comparison.
    const todayDatePart = nowInBrasilia.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

    const tomorrowInBrasilia = new Date(nowInBrasilia);
    tomorrowInBrasilia.setDate(nowInBrasilia.getDate() + 1);
    const tomorrowDatePart = tomorrowInBrasilia.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

    const matches: Match[] = dbMatches.map((dbMatch) => {
      const date = new Date(dbMatch.timestamp * 1000);
      let timeString: string;
      
      const matchTimePart = date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
      });

      const matchDatePart = date.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

      if (matchDatePart === todayDatePart) {
        timeString = `Hoje, ${matchTimePart}`;
      } else if (matchDatePart === tomorrowDatePart) {
        timeString = `Amanhã, ${matchTimePart}`;
      } else {
        // Fallback for other dates, correctly formatted for Brasília timezone.
        timeString = `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone })}, ${matchTimePart}`;
      }
      
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
      };
    });

    return { matches, availableLeagues };
  } catch (error) {
    console.error('Failed to fetch matches from MongoDB:', error);
    return { matches: [], availableLeagues: [] };
  }
}

export default async function BetPage() {
  const { matches, availableLeagues } = await getMatches();
  return <BetPageClient matches={matches} availableLeagues={availableLeagues} />;
}
