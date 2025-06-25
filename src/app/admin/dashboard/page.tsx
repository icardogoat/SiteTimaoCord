
'use server';

import { getDashboardStats, getWeeklyBetVolume, getTopBettors, getRecentBets } from "@/actions/admin-actions";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function Dashboard() {
    const [stats, weeklyVolume, topBettors, recentBets] = await Promise.all([
        getDashboardStats(),
        getWeeklyBetVolume(),
        getTopBettors(),
        getRecentBets()
    ]);

    return (
        <AdminDashboardClient
            stats={stats}
            weeklyVolume={weeklyVolume}
            topBettors={topBettors}
            recentBets={recentBets}
        />
    );
}
