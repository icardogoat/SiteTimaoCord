
'use client';

import { useState, useEffect } from 'react';
import type { Match } from '@/types';
import { MatchCard } from '@/components/match-card';
import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMatches } from '@/actions/bet-actions';
import { Loader2 } from 'lucide-react';

interface BetPageClientProps {
    initialMatches: Match[];
    availableLeagues: string[];
}

const MATCHES_PER_PAGE = 6;

export function BetPageClient({ initialMatches, availableLeagues }: BetPageClientProps) {
    const searchParams = useSearchParams();
    const selectedLeague = searchParams.get('league');

    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialMatches.length === MATCHES_PER_PAGE);

    useEffect(() => {
        setMatches(initialMatches);
        setPage(1);
        setHasMore(initialMatches.length === MATCHES_PER_PAGE);
    }, [selectedLeague, initialMatches]);


    const loadMoreMatches = async () => {
        setIsLoading(true);
        const nextPage = page + 1;
        const newMatches = await getMatches({ league: selectedLeague ?? undefined, page: nextPage });
        
        if (newMatches.length > 0) {
            setMatches(prevMatches => [...prevMatches, ...newMatches]);
            setPage(nextPage);
        }

        if (newMatches.length < MATCHES_PER_PAGE) {
            setHasMore(false);
        }
        
        setIsLoading(false);
    };

    const corinthiansMatches = matches.filter(
        (match) => match.teamA.name === 'Corinthians' || match.teamB.name === 'Corinthians'
    );
    const otherMatches = matches.filter(
        (match) => match.teamA.name !== 'Corinthians' && match.teamB.name !== 'Corinthians'
    );

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{selectedLeague || 'Próximas Partidas'}</h1>
                    <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                </div>
                
                {matches.length === 0 && !isLoading ? (
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

                {hasMore && (
                    <div className="flex justify-center mt-8">
                        <Button onClick={loadMoreMatches} disabled={isLoading} variant="outline" className="w-full sm:w-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Carregando...
                                </>
                            ) : (
                                'Ver mais partidas'
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
