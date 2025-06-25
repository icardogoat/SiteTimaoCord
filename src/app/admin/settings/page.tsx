'use server';

import { getApiSettings } from '@/actions/settings-actions';
import AdminSettingsClient from '@/components/admin-settings-client';

export default async function AdminSettingsPage() {
    const settings = await getApiSettings();
    
    return (
        <AdminSettingsClient
            initialSettings={settings}
        />
    );
}
