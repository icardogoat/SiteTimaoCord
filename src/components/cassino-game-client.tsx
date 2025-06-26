'use client';

import { useState, useEffect, useRef } from 'react';
import type { StandingTeam } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { placeCassinoBet, cashOutCassino } from '@/actions/cassino-actions';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

type GameState = 'idle' | 'betting' | 'playing' | 'crashed';

const PRE_GAME_DELAY = 3000; // 3 seconds before game starts

// Animation component
const FootballCrashAnimation = ({ teams, gameState, multiplier }: { teams: StandingTeam[], gameState: GameState, multiplier: number }) => {
    const [team, setTeam] = useState<StandingTeam | null>(null);

    useEffect(() => {
        if (gameState === 'betting') {
            const randomIndex = Math.floor(Math.random() * teams.length);
            setTeam(teams[randomIndex]);
        }
    }, [gameState, teams]);

    const getBallPosition = () => {
        // Simple logarithmic scale for movement
        const progress = Math.log10(multiplier) / Math.log10(15); // Normalize up to 15x for full width
        return Math.min(progress * 100, 100);
    }
    
    if (gameState === 'idle' || !team) {
        return <div className="text-center text-muted-foreground">Faça sua aposta para começar.</div>;
    }
    
    if (gameState === 'crashed') {
         return <div className="text-5xl font-bold text-destructive animate-pulse">PAROU!</div>;
    }
    
    return (
         <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div className="w-full bg-muted rounded-full h-4 relative overflow-hidden border">
                <div 
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-linear"
                    style={{ width: `${getBallPosition()}%`}}
                />
            </div>
            <div 
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
                style={{ left: `calc(${getBallPosition()}% - 24px)`}}
            >
                <Image src={team.logo} alt={team.name} width={48} height={48} className="rounded-full" data-ai-hint="team logo"/>
            </div>
        </div>
    );
};


export function CassinoGameClient({ teams }: { teams: StandingTeam[] }) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    
    const [betAmount, setBetAmount] = useState('10');
    const [gameState, setGameState] = useState<GameState>('idle');
    const [multiplier, setMultiplier] = useState(1.00);
    const [activeBetId, setActiveBetId] = useState<string | null>(null);
    const [crashPoint, setCrashPoint] = useState<number | null>(null);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState }, [gameState]);


    const stopGame = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        if (gameState === 'playing' && crashPoint) {
            const startTime = Date.now();
            
            intervalRef.current = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                // Exponential growth for multiplier
                const newMultiplier = parseFloat((1 * Math.pow(1.00008, elapsedTime)).toFixed(2));
                
                if (newMultiplier >= crashPoint) {
                    stopGame();
                    setGameState('crashed');
                    setMultiplier(crashPoint);
                } else {
                    setMultiplier(newMultiplier);
                }
            }, 50);

        } else if (gameState === 'crashed' || gameState === 'idle') {
            stopGame();
        }

        return () => stopGame();
    }, [gameState, crashPoint]);

    const handleStartGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Valor inválido", variant: "destructive" });
            return;
        }

        setGameState('betting');
        setMultiplier(1.00);

        const result = await placeCassinoBet(amount);
        if (result.success && result.betId && result.crashPoint) {
            await updateSession();
            setActiveBetId(result.betId);
            setCrashPoint(result.crashPoint);
            setTimeout(() => {
                // Check if user hasn't cancelled
                if (gameStateRef.current === 'betting') {
                    setGameState('playing');
                }
            }, PRE_GAME_DELAY);
        } else {
            toast({ title: "Erro ao iniciar", description: result.message, variant: "destructive" });
            setGameState('idle');
        }
    };
    
    const handleCashOut = async () => {
        if (!activeBetId || gameState !== 'playing') return;
        stopGame();
        
        const result = await cashOutCassino(activeBetId, multiplier);
        if(result.success) {
            toast({ title: "Sucesso!", description: result.message });
            await updateSession();
        } else {
            toast({ title: "Que pena!", description: result.message, variant: "destructive" });
        }
        setGameState('idle');
        setActiveBetId(null);
        setCrashPoint(null);
    };

    const getButton = () => {
        switch (gameState) {
            case 'idle':
                return <Button className="w-full h-16 text-xl" onClick={handleStartGame}>Apostar</Button>;
            case 'betting':
                return <Button className="w-full h-16 text-xl" variant="secondary" disabled><Loader2 className="mr-2 h-6 w-6 animate-spin" />Aguardando...</Button>;
            case 'playing':
                return <Button className="w-full h-16 text-xl" variant="destructive" onClick={handleCashOut}>Sacar R$ {(parseFloat(betAmount) * multiplier).toFixed(2)}</Button>;
            case 'crashed':
                return <Button className="w-full h-16 text-xl" onClick={handleStartGame}>Jogar Novamente</Button>;
        }
    }
    
    const quickBetAmounts = [10, 20, 50, 100];

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Foguetinho FielBet</CardTitle>
                    <CardDescription>Aposte e saque antes que o time erre o gol!</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                        <div className={cn(
                            "absolute inset-0 flex items-center justify-center transition-opacity",
                             gameState === 'playing' ? 'opacity-0' : 'opacity-100'
                        )}>
                            {gameState === 'crashed' && <div className="text-6xl font-bold text-destructive drop-shadow-lg">{crashPoint?.toFixed(2)}x</div>}
                        </div>
                         <div className={cn(
                            "absolute inset-0 flex items-center justify-center transition-opacity",
                             gameState !== 'playing' ? 'opacity-0' : 'opacity-100'
                        )}>
                            <div className="text-6xl font-bold text-primary drop-shadow-lg">{multiplier.toFixed(2)}x</div>
                        </div>
                        <FootballCrashAnimation teams={teams} gameState={gameState} multiplier={multiplier}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Valor da Aposta</label>
                            <Input 
                                type="number" 
                                value={betAmount} 
                                onChange={(e) => setBetAmount(e.target.value)}
                                disabled={gameState !== 'idle' && gameState !== 'crashed'}
                                className="h-12 text-lg"
                            />
                             <div className="flex gap-2">
                                {quickBetAmounts.map(amount => (
                                    <Button key={amount} variant="outline" size="sm" onClick={() => setBetAmount(String(amount))}  disabled={gameState !== 'idle' && gameState !== 'crashed'}>
                                        R$ {amount}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end">
                            {getButton()}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
