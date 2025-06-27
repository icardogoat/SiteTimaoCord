
'use server';

import { getApiSettings } from "@/actions/settings-actions";
import { getStandings } from "@/actions/standings-actions";
import AdminStandingsClient from "@/components/admin-standings-client";

export default async function AdminStandingsPage() {
    const [{ standingsConfig }, standings] = await Promise.all([
        getApiSettings(),
        getStandings()
    ]);
    return <AdminStandingsClient 
        initialConfig={standingsConfig || []} 
        initialStandings={standings || []}
    />;
}
