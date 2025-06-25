'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getActiveBolao } from '@/actions/bolao-actions';
import { BolaoClient } from '@/components/bolao-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';

export default async function BolaoPage() {
    const session = await getServerSession(authOptions);
    const [availableLeagues, activeBolao] = await Promise.all([
        getAvailableLeagues(),
        getActiveBolao(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <BolaoClient activeBolao={activeBolao} sessionUser={session?.user ?? null} />
        </AppLayout>
    );
}
