'use client';

import type { Bolao } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { useState } from 'react';
import { joinBolao } from '@/actions/bolao-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { Session } from 'next-auth';
import { AvatarFallbackText } from './avatar-fallback-text';
import { Separator } from './ui/separator';

const bolaoSchema = z.object({
    home: z.coerce.number().int().min(0, 'Placar não pode ser negativo.'),
    away: z.coerce.number().int().min(0, 'Placar não pode ser negativo.'),
});

interface BolaoClientProps {
    activeBolao: Bolao | null;
    sessionUser: Session['user'] | null;
}

export function BolaoClient({ activeBolao, sessionUser }: BolaoClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof bolaoSchema>>({
        resolver: zodResolver(bolaoSchema),
        defaultValues: {
            home: 0,
            away: 0,
        }
    });

    if (!activeBolao) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Nenhum Bolão Ativo</CardTitle>
                        <CardDescription>Volte mais tarde para participar do próximo bolão!</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    
    const userHasJoined = sessionUser && activeBolao.participants.some(p => p.userId === sessionUser.discordId);
    const userGuess = userHasJoined ? activeBolao.participants.find(p => p.userId === sessionUser.discordId)?.guess : null;

    const onSubmit = async (values: z.infer<typeof bolaoSchema>) => {
        setIsSubmitting(true);
        const result = await joinBolao(activeBolao._id.toString(), values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            form.reset();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Bolão FielBet</h1>
                <p className="text-muted-foreground">Adivinhe o placar e concorra a um prêmio em dinheiro!</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
                {/* Match and Form Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Image src={activeBolao.leagueLogo || `https://placehold.co/40x40.png`} alt={`${activeBolao.league} logo`} width={40} height={40} data-ai-hint="league logo" />
                            <div>
                                <CardTitle className="text-2xl">{activeBolao.league}</CardTitle>
                                <CardDescription>{activeBolao.matchTime}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center space-y-8">
                         <div className="flex items-center justify-around">
                            <div className="flex flex-col items-center gap-2 w-1/3">
                                <Image src={activeBolao.homeLogo} alt={`${activeBolao.homeTeam} logo`} width={64} height={64} className="rounded-full" data-ai-hint="team logo" />
                                <span className="font-bold text-lg text-center">{activeBolao.homeTeam}</span>
                            </div>
                            <span className="text-4xl font-bold text-muted-foreground">vs</span>
                            <div className="flex flex-col items-center gap-2 w-1/3">
                                <Image src={activeBolao.awayLogo} alt={`${activeBolao.awayTeam} logo`} width={64} height={64} className="rounded-full" data-ai-hint="team logo" />
                                <span className="font-bold text-lg text-center">{activeBolao.awayTeam}</span>
                            </div>
                        </div>
                        <Separator />
                        {userHasJoined ? (
                            <div className="space-y-4 pt-4">
                                <h3 className="text-lg font-semibold">Você já participou!</h3>
                                <p className="text-muted-foreground">Seu palpite foi:</p>
                                <p className="text-3xl font-bold">{userGuess?.home} x {userGuess?.away}</p>
                                <p className="text-sm text-muted-foreground">Boa sorte!</p>
                            </div>
                        ) : (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-6">
                                    <h3 className="text-lg font-semibold">Faça seu palpite!</h3>
                                    <div className="flex items-center justify-center gap-4">
                                        <FormField control={form.control} name="home" render={({ field }) => (
                                            <FormItem className="w-24">
                                                <FormControl><Input type="number" className="text-center text-2xl h-16" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <span className="text-2xl font-bold">x</span>
                                         <FormField control={form.control} name="away" render={({ field }) => (
                                            <FormItem className="w-24">
                                                <FormControl><Input type="number" className="text-center text-2xl h-16" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Participar por {formatCurrency(activeBolao.entryFee)}
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </CardContent>
                </Card>

                 {/* Prize and Participants Card */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Prêmio e Participantes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center bg-accent/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Prêmio Acumulado</p>
                            <p className="text-4xl font-bold text-primary">{formatCurrency(activeBolao.prizePool)}</p>
                        </div>
                        
                        <div>
                             <h4 className="flex items-center gap-2 font-semibold mb-4">
                                <Users className="h-5 w-5" />
                                <span>Participantes ({activeBolao.participants.length})</span>
                            </h4>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {activeBolao.participants.map(p => (
                                    <div key={p.userId} className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={p.avatar} alt={p.name} data-ai-hint="user avatar"/>
                                            <AvatarFallback><AvatarFallbackText name={p.name} /></AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{p.name}</span>
                                    </div>
                                ))}
                                {activeBolao.participants.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">Seja o primeiro a participar!</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
