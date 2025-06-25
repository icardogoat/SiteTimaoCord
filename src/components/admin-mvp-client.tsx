
'use client';

import { useState } from 'react';
import type { MvpVoting, MvpPlayer } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { finalizeMvpVoting } from '@/actions/admin-actions';
import { Loader2, Crown } from 'lucide-react';
import Image from 'next/image';

interface AdminMvpClientProps {
    initialVotings: MvpVoting[];
}

interface FinalizeDialogState {
    open: boolean;
    voting: MvpVoting | null;
    selectedPlayerId: number | null;
}

export default function AdminMvpClient({ initialVotings }: AdminMvpClientProps) {
    const { toast } = useToast();
    const [votings, setVotings] = useState(initialVotings);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogState, setDialogState] = useState<FinalizeDialogState>({ open: false, voting: null, selectedPlayerId: null });

    const openVotings = votings.filter(v => v.status === 'Aberto');
    const finalizedVotings = votings.filter(v => v.status === 'Finalizado');

    const handleFinalizeClick = (voting: MvpVoting) => {
        setDialogState({ open: true, voting, selectedPlayerId: null });
    };

    const handleConfirmFinalize = async () => {
        if (!dialogState.voting || dialogState.selectedPlayerId === null) {
            toast({ title: "Erro", description: "Selecione um jogador para ser o MVP.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const result = await finalizeMvpVoting(dialogState.voting._id.toString(), dialogState.selectedPlayerId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            // Update local state to reflect the change
            setVotings(votings.map(v => v._id === dialogState.voting!._id ? { ...v, status: 'Finalizado', mvpPlayerId: dialogState.selectedPlayerId! } : v));
            setDialogState({ open: false, voting: null, selectedPlayerId: null });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const renderVotingCard = (voting: MvpVoting) => {
        const voteCounts = new Map<number, number>();
        voting.votes.forEach(vote => {
            voteCounts.set(vote.playerId, (voteCounts.get(vote.playerId) || 0) + 1);
        });

        const allPlayers = voting.lineups.flatMap(l => l.players);
        const playersWithVotes = allPlayers.map(player => ({
            ...player,
            voteCount: voteCounts.get(player.id) || 0,
        })).sort((a, b) => b.voteCount - a.voteCount);

        const mvpPlayer = voting.status === 'Finalizado' ? allPlayers.find(p => p.id === voting.mvpPlayerId) : null;

        return (
            <Card key={voting._id.toString()}>
                <CardHeader>
                    <CardTitle>{voting.homeTeam} vs {voting.awayTeam}</CardTitle>
                    <CardDescription>{voting.league} - Total de Votos: {voting.votes.length}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-60 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {playersWithVotes.map(player => (
                                <div key={player.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                    <div className="flex items-center gap-2">
                                        <Image src={player.photo} alt={player.name} width={32} height={32} className="rounded-full" data-ai-hint="player photo" />
                                        <span className="text-sm font-medium">{player.name}</span>
                                        {mvpPlayer?.id === player.id && <Crown className="h-4 w-4 text-yellow-500" />}
                                    </div>
                                    <span className="font-bold text-sm">{player.voteCount} votos</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                {voting.status === 'Aberto' && (
                    <CardFooter>
                        <Button onClick={() => handleFinalizeClick(voting)}>Finalizar Votação</Button>
                    </CardFooter>
                )}
            </Card>
        );
    };
    
    const playersInDialog = dialogState.voting?.lineups.flatMap(l => l.players).map(p => ({
        ...p,
        voteCount: dialogState.voting?.votes.filter(v => v.playerId === p.id).length || 0
    })).sort((a,b) => b.voteCount - a.voteCount) ?? [];

    return (
        <>
            <Tabs defaultValue="open">
                <TabsList>
                    <TabsTrigger value="open">Abertas</TabsTrigger>
                    <TabsTrigger value="finalized">Finalizadas</TabsTrigger>
                </TabsList>
                <TabsContent value="open" className="space-y-4">
                    {openVotings.length > 0 ? openVotings.map(renderVotingCard) : <p className="text-muted-foreground mt-4">Nenhuma votação de MVP aberta.</p>}
                </TabsContent>
                <TabsContent value="finalized" className="space-y-4">
                    {finalizedVotings.length > 0 ? finalizedVotings.map(renderVotingCard) : <p className="text-muted-foreground mt-4">Nenhuma votação de MVP finalizada.</p>}
                </TabsContent>
            </Tabs>

            <Dialog open={dialogState.open} onOpenChange={(isOpen) => !isOpen && setDialogState({ open: false, voting: null, selectedPlayerId: null })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finalizar Votação MVP</DialogTitle>
                        <DialogDescription>
                            Selecione o jogador vencedor. O jogador com mais votos está no topo.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-96 pr-4 -mr-4">
                        <div className="space-y-2">
                            {playersInDialog.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => setDialogState(prev => ({ ...prev, selectedPlayerId: player.id }))}
                                    className={`w-full text-left p-2 rounded-md border flex justify-between items-center transition-colors ${dialogState.selectedPlayerId === player.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Image src={player.photo} alt={player.name} width={40} height={40} className="rounded-full" data-ai-hint="player photo" />
                                        <div>
                                            <p className="font-semibold">{player.name}</p>
                                            <p className="text-xs">{player.voteCount} votos</p>
                                        </div>
                                    </div>
                                    {dialogState.selectedPlayerId === player.id && <Crown className="h-5 w-5" />}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ open: false, voting: null, selectedPlayerId: null })} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleConfirmFinalize} disabled={isSubmitting || dialogState.selectedPlayerId === null}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar MVP
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
