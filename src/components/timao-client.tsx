
'use client';

import type { TimaoData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MatchCard } from './match-card';
import { Separator } from './ui/separator';
import { ShieldCheck, Calendar, ChevronsRight, Trophy, Minus, ShieldX, Shirt, Target, Star as StarIcon } from 'lucide-react';
import type { Match, SquadPlayer } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


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
    const isCorinthiansHome = match.teamA.name === 'Corinthians';
    const corinthiansScore = isCorinthiansHome ? match.goals.home : match.goals.away;
    const opponentScore = isCorinthiansHome ? match.goals.away : match.goals.home;

    let result: 'W' | 'D' | 'L' | null = null;
    if (corinthiansScore !== null && opponentScore !== null) {
        if (corinthiansScore > opponentScore) result = 'W';
        else if (corinthiansScore < opponentScore) result = 'L';
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

interface TimaoClientProps {
    initialData: TimaoData;
}

export function TimaoClient({ initialData }: TimaoClientProps) {
    const { upcomingMatches, recentMatches, stats, squad } = initialData;

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    Espaço do Timão
                </h1>
                <p className="text-muted-foreground">Tudo sobre o Corinthians: próximos jogos, resultados e elenco.</p>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Elenco</CardTitle>
                            <CardDescription>Jogadores do elenco principal do Corinthians na temporada atual.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {squad.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Jogador</TableHead>
                                            <TableHead className="hidden sm:table-cell">Posição</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {squad.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarImage src={player.photo} alt={player.name} data-ai-hint="player photo" />
                                                            <AvatarFallback>{player.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{player.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">{player.position}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">Não foi possível carregar o elenco.</p>
                            )}
                        </CardContent>
                    </Card>
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
                        <p className="text-muted-foreground">Nenhum próximo jogo do Corinthians encontrado.</p>
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
                        <p className="text-muted-foreground">Nenhum resultado recente do Corinthians encontrado.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
