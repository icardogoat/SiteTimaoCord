
'use server';

import { getApiSettings } from '@/actions/settings-actions';
import { getSiteSettings } from '@/actions/admin-actions';
import AdminSettingsClient from '@/components/admin-settings-client';

export default async function AdminSettingsPage() {
    const [apiSettings, siteSettings] = await Promise.all([
        getApiSettings(),
        getSiteSettings(),
    ]);
    
    return (
        <AdminSettingsClient
            initialApiSettings={apiSettings}
            initialSiteSettings={siteSettings}
        />
    );

    