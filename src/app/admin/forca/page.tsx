
'use server';

import { getForcaWords } from '@/actions/forca-actions';
import { getBotConfig } from '@/actions/bot-config-actions';
import { AdminForcaClient } from '@/components/admin-forca-client';

export default async function AdminForcaPage() {
    const [words, config] = await Promise.all([
        getForcaWords(),
        getBotConfig()
    ]);
    return <AdminForcaClient initialWords={words} initialSchedule={config.forcaSchedule || []} />;
}
