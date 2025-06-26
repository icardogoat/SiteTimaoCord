
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getGameState, placeCassinoBet, cashOutCassino, startGameRound, getBetsForRound } from '@/actions/cassino-actions';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarFallbackText } from './avatar-fallback-text';
import type { CassinoGameRound, CassinoBet } from '@/types';


const POST_CRASH_DELAY_MS = 4000;

const RocketSvg = () => (
    <svg
        width="80"
        height="120"
        viewBox="0 0 100 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
    >
        <title>Rocket</title>
        {/* Flames */}
        <path
            d="M30 140 C 40 125, 60 125, 70 140 L 50 165 Z"
            fill="url(#flameGradient)"
            transform="translate(0, 5)"
        />
        <path d="M50 120 L 35 145 L 65 145 Z" fill="#94A3B8" />
        {/* Body */}
        <path d="M35 50 C 35 30, 65 30, 65 50 V 120 H 35 V 50 Z" fill="#E2E8F0" />
        {/* Tip */}
        <path d="M50 0 L 35 50 H 65 Z" fill="#3B82F6" />
        {/* Window */}
        <circle cx="50" cy="70" r="12" fill="#3B82F6" stroke="#94A3B8" strokeWidth="2" />
        {/* Fins */}
        <path d="M35 120 L 15 140 V 90 Z" fill="#94A3B8" />
        <path d="M65 120 L 85 140 V 90 Z" fill="#94A3B8" />
        <defs>
            <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FBBF24', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
    </svg>
);

const Explosion = ({ position }: { position: number }) => (
    <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${position}%` }}>
        <div className="absolute w-24 h-24 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
        <div className="absolute w-32 h-32 bg-orange-500 rounded-full animate-ping opacity-50 [animation-delay:0.1s]"></div>
        <div className="absolute w-16 h-16 bg-red-600 rounded-full animate-ping opacity-60 [animation-delay:0.2s]"></div>
    </div>
);

const RocketAnimation = ({ gameState, multiplier, hasCashedOut }: { gameState: CassinoGameRound['status'] | 'idle'; multiplier: number; hasCashedOut: boolean }) => {
    const [stars, setStars] = useState<{ top: string; left: string; size: string; delay: string; duration: string }[]>([]);

    useEffect(() => {
        const newStars = Array.from({ length: 50 }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 1.5 + 0.5}px`,
            delay: `${Math.random() * 5}s`,
            duration: `${Math.random() * 2 + 3}s`,
        }));
        setStars(newStars);
    }, []);

    const getRocketPosition = () => {
        if (multiplier < 1) return 5;
        // Logarithmic scale for smoother take-off and faster acceleration
        const progress = Math.log1p(multiplier - 0.9) / Math.log1p(50); 
        return 5 + Math.min(progress, 1) * 80;
    };
    
    const rocketPosition = getRocketPosition();

    return (
        <div className="w-full h-full flex flex-col items-center justify-end relative overflow-hidden bg-slate-900 rounded-lg">
            {stars.map((star, i) => (
                <div
                    key={i}
                    className="absolute bg-white rounded-full"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        animation: `pulse ${star.duration} infinite`,
                        animationDelay: star.delay,
                    }}
                />
            ))}
            
            {gameState !== 'crashed' ? (
                <div
                    className={cn(
                        'absolute z-10 transition-all duration-100 ease-linear',
                        gameState === 'playing' && 'animate-rocket-shake'
                    )}
                    style={{ bottom: `${rocketPosition}%`, left: 'calc(50% - 40px)' }}
                >
                    <RocketSvg />
                </div>
            ) : (
                <Explosion position={rocketPosition} />
            )}
        </div>
    );
};

const GameHistory = ({ games }: { games: { crashPoint: number }[] }) => {
    const getPointColor = (point: number) => {
        if (point < 1.01) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (point < 2) return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
        if (point < 10) return 'bg-green-500/20 text-green-400 border-green-500/30';
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    };

    return (
        <div className="w-full overflow-x-auto p-2">
            <div className="flex flex-row-reverse gap-2">
                {games.map((game, i) => (
                    <Badge key={i} variant="outline" className={cn("shrink-0", getPointColor(game.crashPoint))}>
                        {game.crashPoint.toFixed(2)}x
                    </Badge>
                ))}
            </div>
        </div>
    );
};

const GameStateDisplay = ({ round, multiplier, hasCashedOut }: { round: CassinoGameRound | null, multiplier: number, hasCashedOut: boolean }) => {
    if (!round) return null;
    
    switch (round.status) {
        case 'betting':
            return <BettingCountdown bettingEndsAt={round.bettingEndsAt} />;
        case 'playing':
            return (
                <div className={cn("text-6xl font-bold drop-shadow-lg", hasCashedOut ? 'text-green-400' : 'text-primary')}>
                    {multiplier.toFixed(2)}x
                </div>
            );
        case 'crashed':
            return <div className="text-6xl font-bold text-destructive drop-shadow-lg">{round.crashPoint.toFixed(2)}x</div>;
        default:
            return null;
    }
}

const BettingCountdown = ({ bettingEndsAt }: { bettingEndsAt: Date | string }) => {
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const ends = new Date(bettingEndsAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, (ends - now) / 1000);
            setCountdown(remaining);
        }, 100);

        return () => clearInterval(interval);
    }, [bettingEndsAt]);

    return (
        <div className="text-center">
            <h2 className="text-3xl font-bold text-primary drop-shadow-lg">Apostas abertas!</h2>
            <p className="text-5xl font-bold">{countdown.toFixed(1)}s</p>
        </div>
    );
};

const PlayerList = ({ players }: { players: CassinoBet[] }) => {
    if (players.length === 0) {
        return <p className="text-center text-sm text-muted-foreground">Nenhum jogador na rodada.</p>
    }

    const getStatusColor = (status: CassinoBet['status']) => {
        return status === 'cashed_out' ? 'text-green-400' : 'text-yellow-400';
    }

    return (
        <div className="space-y-2">
            {players.map(player => (
                <div key={player._id as string} className="flex justify-between items-center bg-muted/50 p-2 rounded-md text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={player.userAvatar} alt={player.userName} data-ai-hint="user avatar" />
                            <AvatarFallback><AvatarFallbackText name={player.userName} /></AvatarFallback>
                        </Avatar>
                        <span className="truncate">{player.userName}</span>
                    </div>
                    <div className={cn("font-semibold", getStatusColor(player.status))}>
                        {player.status === 'cashed_out' && player.cashOutMultiplier
                            ? `${player.cashOutMultiplier.toFixed(2)}x`
                            : `R$ ${player.stake.toFixed(2)}`
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}


export function CassinoGameClient({ initialRecentGames }: { initialRecentGames: { crashPoint: number }[] }) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    
    // Game controls state
    const [betAmount, setBetAmount] = useState('10');
    
    // Game logic state
    const [round, setRound] = useState<CassinoGameRound | null>(null);
    const [multiplier, setMultiplier] = useState(1.00);
    const [playerBet, setPlayerBet] = useState<CassinoBet | null>(null);
    const [playersInRound, setPlayersInRound] = useState<CassinoBet[]>([]);

    // UI state
    const [isProcessing, setIsProcessing] = useState(false);
    
    // History state
    const [recentGames, setRecentGames] = useState(initialRecentGames);

    // Refs for intervals/timeouts
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playersIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const stopAnimation = () => {
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
    };

    const stopPlayerSync = () => {
        if (playersIntervalRef.current) {
            clearInterval(playersIntervalRef.current);
            playersIntervalRef.current = null;
        }
    };
    
    const syncGameState = useCallback(async () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        
        const newRoundState = await getGameState();
        setRound(newRoundState);

        if(newRoundState.status === 'crashed' && !recentGames.some(g => g.crashPoint === newRoundState.crashPoint)) {
             setRecentGames(prev => [...prev.slice(-14), { crashPoint: newRoundState.crashPoint }]);
        }
    }, [recentGames]);

    // Main game loop effect
    useEffect(() => {
        if (!round) {
            syncGameState();
            return;
        }

        stopAnimation();
        stopPlayerSync();
        if(round.status === 'betting') {
            setPlayerBet(null);
            setPlayersInRound([]);
        }

        switch (round.status) {
            case 'betting':
                playersIntervalRef.current = setInterval(async () => {
                    const bets = await getBetsForRound(round._id as string);
                    setPlayersInRound(bets);
                }, 1500);

                const timeUntilStart = new Date(round.bettingEndsAt).getTime() - Date.now();
                syncTimeoutRef.current = setTimeout(async () => {
                    await startGameRound(round._id as string);
                    syncGameState();
                }, Math.max(0, timeUntilStart));
                break;
            
            case 'playing':
                const startTime = new Date(round.startedAt!).getTime();
                
                animationIntervalRef.current = setInterval(() => {
                    const elapsedTime = Date.now() - startTime;
                    const newMultiplier = parseFloat((1 * Math.pow(1.00008, elapsedTime)).toFixed(2));
                    
                    if (newMultiplier >= round.crashPoint) {
                        setMultiplier(round.crashPoint);
                        syncGameState();
                    } else {
                        setMultiplier(newMultiplier);
                    }
                }, 50);

                playersIntervalRef.current = setInterval(async () => {
                    const bets = await getBetsForRound(round._id as string);
                    setPlayersInRound(bets);
                }, 1500);

                break;
            
            case 'crashed':
                setMultiplier(round.crashPoint);
                syncTimeoutRef.current = setTimeout(syncGameState, POST_CRASH_DELAY_MS);
                break;
        }

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            stopAnimation();
            stopPlayerSync();
        };
    }, [round, syncGameState]);

    const handlePlaceBet = async () => {
        if (!round || round.status !== 'betting') return;
        
        setIsProcessing(true);
        const amount = parseFloat(betAmount);
        const result = await placeCassinoBet({ stake: amount, roundId: round._id as string });

        if (result.success && result.bet) {
            toast({ title: "Aposta Aceita!" });
            setPlayerBet(result.bet);
            await updateSession();
        } else {
            toast({ title: "Erro ao Apostar", description: result.message, variant: "destructive" });
        }
        setIsProcessing(false);
    };

    const handleCashOut = async () => {
        if (!playerBet || round?.status !== 'playing' || playerBet.status === 'cashed_out') return;

        setIsProcessing(true);
        const result = await cashOutCassino(playerBet._id as string, multiplier);

        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPlayerBet(prev => prev ? {...prev, status: 'cashed_out', cashOutMultiplier: multiplier, winnings: result.winnings} : null);
            await updateSession();
        } else {
             toast({ title: "Falha ao Sacar", description: result.message, variant: "destructive" });
        }
        setIsProcessing(false);
    }
    
    const getButton = () => {
        if (!round) return <Button className="w-full h-16 text-xl" disabled><Loader2 className="mr-2 h-6 w-6 animate-spin" />Carregando...</Button>;

        switch(round.status) {
            case 'betting':
                if (playerBet) {
                    return <Button className="w-full h-16 text-xl" variant="outline" disabled>Aposta Confirmada</Button>;
                }
                return <Button className="w-full h-16 text-xl" onClick={handlePlaceBet} disabled={isProcessing}>Apostar</Button>;
            
            case 'playing':
                 if (!playerBet) {
                    return <Button className="w-full h-16 text-xl" variant="secondary" disabled>Aguardando...</Button>;
                 }
                 if (playerBet.status === 'cashed_out') {
                    return <Button className="w-full h-16 text-xl" variant="outline" disabled>SACADO!</Button>;
                 }
                return <Button className="w-full h-16 text-xl" variant="destructive" onClick={handleCashOut} disabled={isProcessing}>Sacar R$ {(playerBet.stake * multiplier).toFixed(2)}</Button>;

            case 'crashed':
                 return <Button className="w-full h-16 text-xl" variant="secondary" disabled>Aguardando Próxima Rodada</Button>;
        }
    };
    
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Foguetinho FielBet</h1>
                <p className="text-muted-foreground">Aposte e saque antes que o foguete exploda!</p>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 lg:order-2">
                    <Card>
                        <CardHeader><CardTitle>Jogadores na Rodada ({playersInRound.length})</CardTitle></CardHeader>
                        <CardContent className="max-h-[500px] overflow-y-auto"><PlayerList players={playersInRound} /></CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 lg:order-1 row-start-1 lg:row-start-auto">
                     <Card>
                        <CardContent className="p-2 space-y-2">
                            <GameHistory games={recentGames} />
                            <Separator />
                            <div className="aspect-[16/10] bg-muted/50 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <GameStateDisplay round={round} multiplier={multiplier} hasCashedOut={playerBet?.status === 'cashed_out'} />
                                </div>
                                <RocketAnimation gameState={round?.status || 'idle'} multiplier={multiplier} hasCashedOut={playerBet?.status === 'cashed_out'} />
                            </div>
                        </CardContent>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bet-amount">Valor da Aposta (R$)</Label>
                                    <Input id="bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={round?.status !== 'betting' || !!playerBet || isProcessing} />
                                </div>
                                <div className="flex items-end">{getButton()}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
