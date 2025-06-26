
'use server';

import { getAdminStandings } from "@/actions/admin-actions";
import AdminStandingsClient from "@/components/admin-standings-client";

export default async function AdminStandingsPage() {
    const standings = await getAdminStandings();
    return <AdminStandingsClient initialStandings={standings} />;
}
