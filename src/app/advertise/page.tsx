'use server';

import { AppLayout } from '@/components/app-layout';
import { AdvertiseClient } from '@/components/advertise-client';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getUserAdPrice } from '@/actions/user-ad-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function AdvertisePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }
    
    const [availableLeagues, adPrice] = await Promise.all([
        getAvailableLeagues(),
        getUserAdPrice(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <AdvertiseClient adPrice={adPrice} userBalance={session.user.balance} />
        </AppLayout>
    );
}
