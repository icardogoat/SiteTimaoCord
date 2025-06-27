
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { TimaoClient } from '@/components/timao-client';
import { getTimaoData } from '@/actions/timao-actions';

export default async function TimaoPage() {
    const [availableLeagues, timaoData] = await Promise.all([
        getAvailableLeagues(),
        getTimaoData()
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <TimaoClient initialData={timaoData} />
        </AppLayout>
    );
}
