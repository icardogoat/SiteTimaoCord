'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import type { LiveStreamAlert, LiveStreamPoll, LiveStreamPollOption } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface LiveStreamOverlayProps {
    streamId: string;
    initialAlert: LiveStreamAlert | null;
    initialPoll: LiveStreamPoll | null;
}

export function LiveStreamOverlay({ streamId, initialAlert, initialPoll }: LiveStreamOverlayProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [alert, setAlert] = useState(initialAlert);
    const [poll, setPoll] = useState(initialPoll);
    const [lastAlertUpdate, setLastAlertUpdate] = useState(initialAlert?.updatedAt);
    const [lastPollUpdate, setLastPollUpdate] = useState(initialPoll?.updatedAt);

    // Poll for updates every few seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/stream/${streamId}/live`);
                if (!response.ok) return;
                const data = await response.json();

                if (data.liveAlert && data.liveAlert.updatedAt !== lastAlertUpdate) {
                    setAlert(data.liveAlert);
                    setLastAlertUpdate(data.liveAlert.updatedAt);
                } else if (!data.liveAlert) {
                    setAlert(null);
                }
                
                if (data.livePoll && data.livePoll.updatedAt !== lastPollUpdate) {
                    setPoll(data.livePoll);
                    setLastPollUpdate(data.livePoll.updatedAt);
                } else if (!data.livePoll) {
                    setPoll(null);
                }

            } catch (error) {
                console.error("Failed to fetch live stream data:", error);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [streamId, lastAlertUpdate, lastPollUpdate]);

    const handleVote = async (optionId: string) => {
        if (!session) {
            toast({ title: 'Acesso Negado', description: 'Você precisa estar logado para votar.', variant: 'destructive' });
            return;
        }
        if (!poll || poll.voters.includes(session.user.discordId)) {
            toast({ title: 'Voto Duplicado', description: 'Você já votou nesta enquete.', variant: 'destructive' });
            return;
        }

        try {
            const res = await fetch(`/api/stream/${streamId}/live`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optionId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Sucesso!', description: 'Seu voto foi computado.' });
            // Optimistically update the poll state
            setPoll(prevPoll => {
                if (!prevPoll) return null;
                return {
                    ...prevPoll,
                    voters: [...prevPoll.voters, session.user!.discordId],
                    options: prevPoll.options.map(opt => 
                        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
                    )
                };
            });
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const hasVoted = session && poll && poll.voters.includes(session.user.discordId);
    const totalVotes = poll?.options.reduce((sum, opt) => sum + opt.votes, 0) || 0;

    return (
        <div className="absolute inset-0 pointer-events-none grid grid-rows-3 grid-cols-5 p-8">
            {/* Poll */}
            <AnimatePresence>
                {poll && poll.isActive && (
                    <motion.div
                        className="col-start-2 col-span-3 row-start-1 pointer-events-auto"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="bg-background/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>{poll.question}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {poll.options.map(option => {
                                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                                    return (
                                        <div key={option.id}>
                                            {hasVoted ? (
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>{option.text}</span>
                                                        <span>{percentage.toFixed(0)}%</span>
                                                    </div>
                                                    <Progress value={percentage} />
                                                </div>
                                            ) : (
                                                 <Button className="w-full justify-start" variant="secondary" onClick={() => handleVote(option.id)}>
                                                    {option.text}
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Alert */}
            <AnimatePresence>
                {alert && alert.isActive && (
                    <motion.div
                        key={alert.updatedAt.toString()}
                        className="col-span-full row-start-3 self-end justify-self-center"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="bg-primary text-primary-foreground font-bold text-2xl md:text-4xl px-8 py-4 rounded-lg shadow-2xl">
                            {alert.text}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
