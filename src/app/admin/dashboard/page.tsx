
'use server';

import { getDashboardStats, getChartData, getTopBettors, getRecentUsers } from "@/actions/admin-actions";
import { getRichestUsers, getTopLevelUsers } from "@/actions/user-actions";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function Dashboard() {
    const [stats, chartData, topBettors, recentUsers, richestUsers, topLevelUsers] = await Promise.all([
        getDashboardStats(),
        getChartData('weekly'),
        getTopBettors(),
        getRecentUsers(),
        getRichestUsers(),
        getTopLevelUsers()
    ]);

    return (
        <AdminDashboardClient
            stats={stats}
            initialChartData={chartData}
            topBettors={topBettors.slice(0, 5)}
            recentUsers={recentUsers}
            richestUsers={richestUsers.slice(0, 5)}
            topLevelUsers={topLevelUsers.slice(0, 5)}
        />
    );
}
