
'use client';

import type { Match } from '@/types';
import { MatchCard } from '@/components/match-card';
import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';

interface BetPageClientProps {
    matches: Match[];
    availableLeagues: string[];
}

export function BetPageClient({ matches, availableLeagues }: BetPageClientProps) {
    const searchParams = useSearchParams();
    const selectedLeague = searchParams.get('league');

    const filteredMatches = selectedLeague
        ? matches.filter((match) => match.league === selectedLeague)
        : matches;

    const corinthiansMatches = filteredMatches.filter(
        (match) => match.teamA.name === 'Corinthians' || match.teamB.name === 'Corinthians'
    );
    const otherMatches = filteredMatches.filter(
        (match) => match.teamA.name !== 'Corinthians' && match.teamB.name !== 'Corinthians'
    );

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <main className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{selectedLeague || 'Próximas Partidas'}</h1>
                    <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                </div>
                
                {filteredMatches.length === 0 ? (
                    <div className="flex items-center justify-center pt-16">
                        <Card className="w-full max-w-lg text-center">
                            <CardHeader>
                                <CardTitle>Nenhuma partida disponível no momento.</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
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
                                {corinthiansMatches.length > 0 && <h2 className="text-2xl font-bold font-headline tracking-tight border-b pb-2 mb-6">Outras Partidas</h2>}
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
