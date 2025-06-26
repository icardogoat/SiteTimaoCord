'use server';

import { AppLayout } from '@/components/app-layout';
import { CassinoGameClient } from '@/components/cassino-game-client';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function CassinoPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }
    
    const availableLeagues = await getAvailableLeagues();

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <CassinoGameClient />
        </AppLayout>
    );
}
