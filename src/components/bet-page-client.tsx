'use client';

import type { Match } from '@/types';
import { MatchCard } from '@/components/match-card';
import { AppLayout } from '@/components/app-layout';

interface BetPageClientProps {
    matches: Match[];
}

export function BetPageClient({ matches }: BetPageClientProps) {
    return (
        <AppLayout>
            <main className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Próximas Partidas</h1>
                    <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            </main>
        </AppLayout>
    )
}
