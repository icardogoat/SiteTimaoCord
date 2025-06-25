
'use client';

import type { MvpVoting } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import { useState } from 'react';
import { castVote } from '@/actions/mvp-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Star, XCircle } from 'lucide-react';
import { Session } from 'next-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

interface MvpCardProps {
    voting: MvpVoting;
    sessionUser: Session['user'] | null;
    onVote: () => void;
}

function MvpCard({ voting, sessionUser, onVote }: MvpCardProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

    const userVote = sessionUser ? voting.votes.find(v => v.userId === sessionUser.discordId) : null;
    const mvpPlayer = voting.status === 'Finalizado' ? voting.lineups.flatMap(l => l.players).find(p => p.id === voting.mvpPlayerId) : null;

    const handleVote = async (playerId: number) => {
        setIsSubmitting(playerId);
        const result = await castVote(voting._id.toString(), playerId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            onVote();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{voting.homeTeam} vs {voting.awayTeam}</CardTitle>
                        <CardDescription>{voting.league}</CardDescription>
                    </div>
                     <Badge variant={voting.status === 'Aberto' ? 'default' : voting.status === 'Cancelado' ? 'destructive' : 'secondary'}>
                        {voting.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {voting.lineups.map(lineup => (
                    <div key={lineup.teamId}>
                        <div className="flex items-center gap-2 mb-3">
                            <Image src={lineup.teamLogo} alt={`${lineup.teamName} logo`} width={24} height={24} className="rounded-full" data-ai-hint="team logo" />
                            <h3 className="font-semibold">{lineup.teamName}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {lineup.players.map(player => (
                                <div key={player.id} className="p-2 border rounded-lg flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Image src={player.photo} alt={player.name} width={40} height={40} className="rounded-full" data-ai-hint="player photo" />
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{player.name}</p>
                                        </div>
                                    </div>
                                    {voting.status === 'Aberto' && !userVote && (
                                        <Button size="sm" onClick={() => handleVote(player.id)} disabled={!!isSubmitting}>
                                            {isSubmitting === player.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Votar'}
                                        </Button>
                                    )}
                                    {userVote?.playerId === player.id && (
                                        <Star className="h-5 w-5 text-yellow-400" title="Seu voto" />
                                    )}
                                    {mvpPlayer?.id === player.id && (
                                        <Crown className="h-5 w-5 text-yellow-500" title="MVP" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
            {voting.status === 'Aberto' && !userVote && (
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">Vote no seu jogador preferido e ganhe R$ 100,00 de bônus!</p>
                </CardFooter>
            )}
             {voting.status === 'Finalizado' && mvpPlayer && (
                 <CardFooter className="bg-primary/10 rounded-b-lg p-4">
                    <div className="flex items-center gap-3">
                        <Crown className="h-6 w-6 text-yellow-500" />
                        <p className="font-semibold">O MVP da partida foi: {mvpPlayer.name}!</p>
                    </div>
                </CardFooter>
            )}
            {voting.status === 'Cancelado' && (
                 <CardFooter className="bg-destructive/10 rounded-b-lg p-4">
                    <div className="flex items-center gap-3">
                        <XCircle className="h-6 w-6 text-destructive" />
                        <p className="font-semibold text-destructive">Esta votação foi cancelada.</p>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}


interface MvpClientProps {
    activeVotings: MvpVoting[];
    sessionUser: Session['user'] | null;
}

export function MvpClient({ activeVotings, sessionUser }: MvpClientProps) {
    const [votings, setVotings] = useState(activeVotings);

    const handleVoteSuccess = () => {
        // A simple way to refresh data without a full page reload is just to re-set it from props
        // A more complex app might refetch just the one item.
        setVotings(activeVotings);
    };
    
    const openVotings = votings.filter(v => v.status === 'Aberto');
    const closedVotings = votings.filter(v => v.status === 'Finalizado' || v.status === 'Cancelado');

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Votação MVP</h1>
                <p className="text-muted-foreground">Escolha o melhor jogador da partida e ganhe recompensas!</p>
            </div>
             <Tabs defaultValue="open" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                    <TabsTrigger value="open">Abertas</TabsTrigger>
                    <TabsTrigger value="closed">Encerradas</TabsTrigger>
                </TabsList>
                <TabsContent value="open">
                     {openVotings.length === 0 ? (
                        <div className="flex items-center justify-center pt-16">
                            <Card className="w-full max-w-md text-center">
                                <CardHeader>
                                    <CardTitle>Nenhuma Votação Aberta</CardTitle>
                                    <CardDescription>Volte mais tarde para votar!</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    ) : (
                        <div className="grid gap-8 mt-6">
                            {openVotings.map(voting => (
                                <MvpCard key={voting._id as string} voting={voting} sessionUser={sessionUser} onVote={handleVoteSuccess} />
                            ))}
                        </div>
                    )}
                </TabsContent>
                 <TabsContent value="closed">
                     {closedVotings.length === 0 ? (
                        <div className="flex items-center justify-center pt-16">
                            <Card className="w-full max-w-md text-center">
                                <CardHeader>
                                    <CardTitle>Nenhuma Votação Encerrada</CardTitle>
                                    <CardDescription>Os resultados aparecerão aqui.</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    ) : (
                        <div className="grid gap-8 mt-6">
                            {closedVotings.map(voting => (
                                <MvpCard key={voting._id as string} voting={voting} sessionUser={sessionUser} onVote={handleVoteSuccess} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
