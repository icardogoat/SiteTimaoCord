'use server';

import { BetPageClient } from '@/components/bet-page-client';
import { getAvailableLeagues, getMatches } from '@/actions/bet-actions';
import { getDisplayAdvertisements } from '@/actions/ad-actions';

export default async function BetPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined }}) {
  const leagueParam = searchParams?.league;
  const league = Array.isArray(leagueParam) ? leagueParam[0] : leagueParam;
  
  const [initialMatches, availableLeagues, ads] = await Promise.all([
    getMatches({ league, page: 1 }),
    getAvailableLeagues(),
    getDisplayAdvertisements(),
  ]);
  
  return <BetPageClient initialMatches={initialMatches} availableLeagues={availableLeagues} ads={ads} />;
}
