
'use server';

import { getDashboardStats, getChartData, getTopBettors, getRecentBets } from "@/actions/admin-actions";
import { getRichestUsers, getTopLevelUsers } from "@/actions/user-actions";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function Dashboard() {
    const [stats, chartData, topBettors, recentBets, richestUsers, topLevelUsers] = await Promise.all([
        getDashboardStats(),
        getChartData('weekly'),
        getTopBettors(),
        getRecentBets(),
        getRichestUsers(),
        getTopLevelUsers()
    ]);

    return (
        <AdminDashboardClient
            stats={stats}
            initialChartData={chartData}
            topBettors={topBettors.slice(0, 5)}
            recentBets={recentBets}
            richestUsers={richestUsers.slice(0, 5)}
            topLevelUsers={topLevelUsers.slice(0, 5)}
        />
    );
}
