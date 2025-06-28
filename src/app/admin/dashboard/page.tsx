
'use server';

import { getDashboardStats, getChartData, getTopBettors, getRecentBets } from "@/actions/admin-actions";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function Dashboard() {
    const [stats, chartData, topBettors, recentBets] = await Promise.all([
        getDashboardStats(),
        getChartData('weekly'),
        getTopBettors(),
        getRecentBets()
    ]);

    return (
        <AdminDashboardClient
            stats={stats}
            initialChartData={chartData}
            topBettors={topBettors}
            recentBets={recentBets}
        />
    );
}
