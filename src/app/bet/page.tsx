
import { BetPageClient } from '@/components/bet-page-client';
import clientPromise from '@/lib/mongodb';
import type { Match } from '@/types';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
};

async function getMatches(): Promise<Match[]> {
  try {
    const client = await clientPromise;
    const db = client.db("timaocord");
    const matchesCollection = db.collection<DbMatch>("matches");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTimestamp = Math.floor(startOfToday.getTime() / 1000);

    const dbMatches = await matchesCollection
      .find({
        isFinished: false,
        timestamp: { $gte: todayTimestamp },
      })
      .sort({ timestamp: 1 })
      .toArray();

    const matches: Match[] = dbMatches.map((dbMatch) => {
      const date = new Date(dbMatch.timestamp * 1000);
      let timeString: string;

      if (isToday(date)) {
        timeString = `Hoje, ${format(date, 'HH:mm')}`;
      } else if (isTomorrow(date)) {
        timeString = `Amanhã, ${format(date, 'HH:mm')}`;
      } else {
        timeString = format(date, 'dd/MM, HH:mm', { locale: ptBR });
      }

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
        markets: dbMatch.markets.map((market) => ({
          name: market.name,
          odds: market.odds,
        })),
      };
    });

    return matches;
  } catch (error) {
    console.error('Failed to fetch matches from MongoDB:', error);
    return [];
  }
}

export default async function BetPage() {
  const matches = await getMatches();
  return <BetPageClient matches={matches} />;
}
