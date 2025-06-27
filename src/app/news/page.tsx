
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getNews } from '@/actions/news-actions';
import { NewsClient } from '@/components/news-client';

export default async function NewsPage() {
    const [availableLeagues, initialNews] = await Promise.all([
        getAvailableLeagues(),
        getNews(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <NewsClient initialNews={initialNews} />
        </AppLayout>
    );
}
