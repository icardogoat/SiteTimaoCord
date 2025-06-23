'use client';

import type { Match } from '@/types';
import { MatchCard } from '@/components/match-card';
import { AppLayout } from '@/components/app-layout';

interface BetPageClientProps {
    matches: Match[];
}

export function BetPageClient({ matches }: BetPageClientProps) {
    const corinthiansMatches = matches.filter(
        (match) => match.teamA.name === 'Corinthians' || match.teamB.name === 'Corinthians'
    );
    const otherMatches = matches.filter(
        (match) => match.teamA.name !== 'Corinthians' && match.teamB.name !== 'Corinthians'
    );

    return (
        <AppLayout>
            <main className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Próximas Partidas</h1>
                    <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                </div>
                
                {matches.length === 0 ? (
                    <p className="text-muted-foreground text-center mt-8">Nenhuma partida encontrada no momento.</p>
                ) : (
                    <div className="space-y-12">
                         {corinthiansMatches.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline tracking-tight border-b pb-2 mb-6">Jogos do Timão</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {corinthiansMatches.map((match) => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {otherMatches.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline tracking-tight border-b pb-2 mb-6">Outras Partidas</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {otherMatches.map((match) => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </AppLayout>
    )
}
