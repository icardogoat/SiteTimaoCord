
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getActiveVotings } from '@/actions/mvp-actions';
import { MvpClient } from '@/components/mvp-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';

export default async function MvpPage() {
    const session = await getServerSession(authOptions);
    const [availableLeagues, activeVotings] = await Promise.all([
        getAvailableLeagues(),
        getActiveVotings(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <MvpClient activeVotings={activeVotings} sessionUser={session?.user ?? null} />
        </AppLayout>
    );
}
