'use server';

import { AppLayout } from '@/components/app-layout';
import { CassinoGameClient } from '@/components/cassino-game-client';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getRecentCassinoGames } from '@/actions/cassino-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function FoguetinhoPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }
    
    const [availableLeagues, recentGames] = await Promise.all([
        getAvailableLeagues(),
        getRecentCassinoGames(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <CassinoGameClient initialRecentGames={recentGames} />
        </AppLayout>
    );
}
