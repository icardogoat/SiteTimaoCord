
'use server';

import { getAvailableLeagues } from "@/actions/bet-actions";
import { getHighlightedLeagues } from "@/actions/settings-actions";
import AdminHighlightsClient from "@/components/admin-highlights-client";

export default async function AdminHighlightsPage() {
    const [availableLeagues, highlightedLeagues] = await Promise.all([
        getAvailableLeagues(),
        getHighlightedLeagues()
    ]);

    return (
        <AdminHighlightsClient
            initialAvailableLeagues={availableLeagues}
            initialHighlightedLeagues={highlightedLeagues}
        />
    );
}
