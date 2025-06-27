
'use server';

import { getApiSettings } from "@/actions/settings-actions";
import AdminStandingsClient from "@/components/admin-standings-client";

export default async function AdminStandingsPage() {
    const { standingsConfig } = await getApiSettings();
    return <AdminStandingsClient initialConfig={standingsConfig || []} />;
}
