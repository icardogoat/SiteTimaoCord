'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getStandings } from '@/actions/standings-actions';
import { StandingsClient } from '@/components/standings-client';

export default async function StandingsPage() {
  const [availableLeagues, standings] = await Promise.all([
    getAvailableLeagues(),
    getStandings(),
  ]);

  return (
    <AppLayout availableLeagues={availableLeagues}>
      <StandingsClient standings={standings} />
    </AppLayout>
  );
}
