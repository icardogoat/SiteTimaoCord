
'use server';

import { getForcaWords } from '@/actions/forca-actions';
import { AdminForcaClient } from '@/components/admin-forca-client';

export default async function AdminForcaPage() {
    const words = await getForcaWords();
    return <AdminForcaClient initialWords={words} />;
}
