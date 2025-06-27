
'use client';

import type { TimaoData, SquadPlayer } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MatchCard } from './match-card';
import { Separator } from './ui/separator';
import { ShieldCheck, Calendar, ChevronsRight, Trophy, Minus, ShieldX, Plus } from 'lucide-react';
import type { Match } from '@/types';
import Image from 'next/image';

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: string | number; icon: React.ElementType; colorClass?: string }) => (
  <Card className="text-center">
    <CardContent className="p-4 flex flex-col items-center gap-2">
      <Icon className={`h-8 w-8 ${colorClass || 'text-muted-foreground'}`} />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

const RecentMatchItem = ({ match }: { match: Match }) => {
    const isFlamengoHome = match.teamA.name === 'Flamengo';
    const flamengoScore = isFlamengoHome ? match.goals.home : match.goals.away;
    const opponentScore = isFlamengoHome ? match.goals.away : match.goals.home;

    let result: 'W' | 'D' | 'L' | null = null;
    if (flamengoScore !== null && opponentScore !== null) {
        if (flamengoScore > opponentScore) result = 'W';
        else if (flamengoScore < opponentScore) result = 'L';
        else result = 'D';
    }

    const resultClasses = {
        W: 'bg-green-500 text-white',
        D: 'bg-gray-500 text-white',
        L: 'bg-red-500 text-white',
    };

    const resultIcons = {
        W: Trophy,
        D: Minus,
        L: ShieldX,
    }

    const ResultIcon = result ? resultIcons[result] : ChevronsRight;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-card-foreground/5 hover:bg-card-foreground/10 transition-colors">
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{match.league}</span>
                <span className="font-medium">{match.teamA.name} vs {match.teamB.name}</span>
            </div>
            <div className="flex items-center gap-4">
                 <span className="text-lg font-bold">{match.goals.home} - {match.goals.away}</span>
                 {result && (
                     <div className={`flex h-8 w-8 items-center justify-center rounded-full ${resultClasses[result]}`}>
                        <ResultIcon className="h-4 w-4" />
                     </div>
                 )}
            </div>
        </div>
    );
};

const PlayerCard = ({ player }: { player: SquadPlayer }) => {
    return (
        <div className="group relative w-full aspect-[2/3] overflow-hidden rounded-lg bg-card border border-border">
            <Image
                src={player.photo}
                alt={player.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                data-ai-hint="player photo"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
            <div className="absolute top-0 left-0 right-0 p-3">
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white drop-shadow-md text-base">{player.name}</h3>
                    <Plus className="w-5 h-5 text-white/70" />
                </div>
            </div>
        </div>
    );
};

interface TimaoClientProps {
    initialData: TimaoData;
}

export function TimaoClient({ initialData }: TimaoClientProps) {
    const { upcomingMatches, recentMatches, stats, squad } = initialData;

    const positionTranslations: { [key: string]: string } = {
        'Goalkeeper': 'GOLEIROS',
        'Defender': 'ZAGUEIROS',
        'Midfielder': 'MEIO-CAMPISTAS',
        'Attacker': 'ATACANTES',
        'Desconhecido': 'OUTROS'
    };

    const groupedSquad = squad.reduce((acc, player) => {
        const position = positionTranslations[player.position] || 'OUTROS';
        if (!acc[position]) {
            acc[position] = [];
        }
        acc[position].push(player);
        return acc;
    }, {} as Record<string, SquadPlayer[]>);

    const positionOrder = ['GOLEIROS', 'ZAGUEIROS', 'MEIO-CAMPISTAS', 'ATACANTES', 'OUTROS'];
    const sortedGroupedSquadKeys = Object.keys(groupedSquad).sort((a, b) => {
        return positionOrder.indexOf(a) - positionOrder.indexOf(b);
    });

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    Espaço do Mengão
                </h1>
                <p className="text-muted-foreground">Tudo sobre o Flamengo: próximos jogos, resultados e elenco.</p>
            </div>

            <div className="space-y-8">
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>Estatísticas (Últimos 5 Jogos)</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Vitórias" value={stats.wins} icon={Trophy} colorClass="text-green-500" />
                            <StatCard title="Empates" value={stats.draws} icon={Minus} />
                            <StatCard title="Derrotas" value={stats.losses} icon={ShieldX} colorClass="text-red-500" />
                            <StatCard title="Total de Partidas" value={stats.totalMatches} icon={Calendar} />
                        </CardContent>
                    </Card>
                </section>
                
                <section>
                    <h2 className="text-2xl font-bold font-headline mb-4">Elenco</h2>
                    <div className="space-y-8">
                        {sortedGroupedSquadKeys.map(position => {
                            if (groupedSquad[position].length === 0) return null;
                            return (
                                <div key={position}>
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">
                                        {position}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {groupedSquad[position].map(player => (
                                            <PlayerCard key={player.id} player={player} />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                <Separator />

                <section>
                    <h2 className="text-2xl font-bold font-headline mb-4">Próximos Jogos</h2>
                    {upcomingMatches.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingMatches.map(match => (
                                <MatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Nenhum próximo jogo do Flamengo encontrado.</p>
                    )}
                </section>

                <Separator />

                <section>
                    <h2 className="text-2xl font-bold font-headline mb-4">Resultados Recentes</h2>
                    {recentMatches.length > 0 ? (
                         <div className="space-y-3">
                            {recentMatches.map(match => (
                                <RecentMatchItem key={match.id} match={match} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Nenhum resultado recente do Flamengo encontrado.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
