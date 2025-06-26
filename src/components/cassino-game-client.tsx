
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getGameState, placeCassinoBet, cashOutCassino, startGameRound, getBetsForRound } from '@/actions/cassino-actions';
import { Loader2, Zap, Rocket } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarFallbackText } from './avatar-fallback-text';
import type { CassinoGameRound, CassinoBet } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';


const POST_CRASH_DELAY_MS = 4000;

const RocketSvg = () => (
    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
        <defs>
            <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
        </defs>
        <g className="animate-[rocket-thrust_0.4s_ease-in-out_infinite]">
            <path d="M9 21.5C9 21.5 8 20.5 8 19C8 17.5 9 16.5 9 16.5L12 15L15 16.5C15 16.5 16 17.5 16 19C16 20.5 15 21.5 15 21.5H9Z" fill="url(#flameGradient)" />
        </g>
        <path d="M12 2C12 2 13 4.58172 13 8V15H11V8C11 4.58172 12 2 12 2Z" fill="#E2E8F0" />
        <path d="M13 15L17 17.5V12.5L13 11V15Z" fill="#94A3B8" />
        <path d="M11 15L7 17.5V12.5L11 11V15Z" fill="#94A3B8" />
        <path d="M12 2L11 5H13L12 2Z" fill="#3B82F6" />
    </svg>
);

const Explosion = () => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-yellow-300 rounded-full animate-explosion-outer opacity-0"></div>
        <div className="w-8 h-8 bg-orange-400 rounded-full animate-explosion-inner opacity-0 absolute"></div>
    </div>
);

const RocketAnimation = ({ multiplier, gameState }: { multiplier: number, gameState: CassinoGameRound['status'] | 'idle' }) => {
    const [stars, setStars] = useState<{ top: string; left: string; size: string; delay: string; duration: string }[]>([]);

    useEffect(() => {
        setStars(
            Array.from({ length: 50 }).map(() => ({
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                size: `${Math.random() * 1.5 + 0.5}px`,
                delay: `${Math.random() * 10}s`,
                duration: `${Math.random() * 5 + 5}s`,
            }))
        );
    }, []);

    const getRocketPosition = () => {
        // Start at the bottom center of the container
        if (multiplier < 1 || gameState === 'betting') return { bottom: '5%', left: '50%', transform: 'translateX(-50%)' };
        
        // Logarithmic scale for a smoother take-off
        const progress = Math.log1p(multiplier - 0.9) / Math.log1p(30); // 30 is an arbitrary max for scaling
        const clampedProgress = Math.min(progress, 1);
        
        const bottom = 5 + clampedProgress * 80; // Move up to 85% of the container height
        
        return { bottom: `${bottom}%`, left: '50%', transform: 'translateX(-50%)' };
    };

    const position = getRocketPosition();

    return (
        <div className="w-full h-full flex flex-col items-center justify-end relative overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900">
             {stars.map((star, i) => (
                <div
                    key={i}
                    className="absolute bg-slate-400 rounded-full animate-star-travel"
                    style={{
                        top: '-10px',
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        animationDelay: star.delay,
                        animationDuration: star.duration,
                    }}
                />
            ))}
            {gameState !== 'crashed' ? (
                <div
                    className="absolute z-10 transition-all duration-100 ease-linear"
                    style={{ ...position }}
                >
                    <RocketSvg />
                </div>
            ) : <Explosion />}
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
        <div className="w-full overflow-x-auto p-2 bg-background/50">
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
                <div className={cn("text-6xl font-bold font-mono drop-shadow-lg transition-colors", hasCashedOut ? 'text-green-400' : 'text-primary')}>
                    {multiplier.toFixed(2)}x
                </div>
            );
        case 'crashed':
            return <div className="text-6xl font-bold font-mono text-destructive drop-shadow-lg">{round.crashPoint.toFixed(2)}x</div>;
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
            <h2 className="text-2xl font-bold text-primary drop-shadow-lg">Apostas em {countdown.toFixed(1)}s</h2>
        </div>
    );
};

const PlayerList = ({ players }: { players: CassinoBet[] }) => {
    const { data: session } = useSession();
    const currentUserDiscordId = session?.user?.discordId;

    if (players.length === 0) {
        return <p className="text-center text-sm text-muted-foreground">Nenhum jogador na rodada.</p>
    }

    return (
        <div className="space-y-2">
            {players.map(player => {
                const isCurrentUser = player.userId === currentUserDiscordId;
                const cashedOut = player.status === 'cashed_out';
                return (
                    <div key={player._id as string} className={cn(
                        "flex justify-between items-center bg-muted/50 p-2 rounded-md text-sm transition-all",
                        isCurrentUser && "bg-primary/10 border border-primary/50",
                        cashedOut && "opacity-60"
                        )}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={player.userAvatar} alt={player.userName} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={player.userName} /></AvatarFallback>
                            </Avatar>
                            <span className="truncate">{player.userName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                             <Badge variant="outline" className="hidden sm:inline-flex">R$ {player.stake.toFixed(2)}</Badge>
                             {cashedOut && player.winnings ? (
                                <Badge variant="default" className="bg-green-600">R$ {player.winnings.toFixed(2)}</Badge>
                             ) : (
                                <Badge variant="destructive" className="hidden sm:inline-flex">Em Jogo</Badge>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function CassinoGameClient({ initialRecentGames }: { initialRecentGames: { crashPoint: number }[] }) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    
    // Game controls state
    const [betAmount, setBetAmount] = useState('10');
    const [autoCashOut, setAutoCashOut] = useState('');
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    const [autoBetRounds, setAutoBetRounds] = useState('0');

    // Game logic state
    const [round, setRound] = useState<CassinoGameRound | null>(null);
    const [multiplier, setMultiplier] = useState(1.00);
    const [playerBet, setPlayerBet] = useState<CassinoBet | null>(null);
    const [playersInRound, setPlayersInRound] = useState<CassinoBet[]>([]);

    // UI state
    const [isProcessing, setIsProcessing] = useState(false);
    const [gameState, setGameState] = useState<'idle' | 'betting' | 'playing' | 'crashed'>('idle');
    
    // History state
    const [recentGames, setRecentGames] = useState(initialRecentGames);

    // Refs for intervals/timeouts
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playersIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasCashedOutRef = useRef(false);
    const roundsLeftRef = useRef(0);

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
        
        try {
            const newRoundState = await getGameState();
            setRound(newRoundState);
            setGameState(newRoundState.status);

            if (newRoundState.status === 'betting' && !playerBet) {
                hasCashedOutRef.current = false;
            }
        
            if(newRoundState.status === 'crashed' && !recentGames.some(g => g.crashPoint === newRoundState.crashPoint)) {
                setRecentGames(prev => [...prev.slice(-14), { crashPoint: newRoundState.crashPoint }]);
            }
        } catch (error) {
            console.error("Failed to sync game state:", error);
            // Retry after a delay
            syncTimeoutRef.current = setTimeout(syncGameState, 5000);
        }
    }, [recentGames, playerBet]);

    // Main game loop effect
    useEffect(() => {
        if (!round) {
            syncGameState();
            return;
        }

        stopAnimation();
        stopPlayerSync();

        switch (round.status) {
            case 'betting':
                setPlayerBet(null);
                setPlayersInRound([]);
                hasCashedOutRef.current = false;

                playersIntervalRef.current = setInterval(async () => {
                    if (round) {
                       const bets = await getBetsForRound(round._id as string);
                       setPlayersInRound(bets);
                    }
                }, 1500);

                if (isAutoBetting && roundsLeftRef.current > 0 && !playerBet) {
                    handlePlaceBet();
                    roundsLeftRef.current -= 1;
                    setAutoBetRounds(String(roundsLeftRef.current));
                }
                
                if (roundsLeftRef.current === 0) {
                    setIsAutoBetting(false);
                }

                const timeUntilStart = new Date(round.bettingEndsAt).getTime() - Date.now();
                syncTimeoutRef.current = setTimeout(async () => {
                    await startGameRound(round._id as string);
                    await syncGameState();
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
                   if (round) {
                       const bets = await getBetsForRound(round._id as string);
                       setPlayersInRound(bets);
                   }
                }, 1500);

                break;
            
            case 'crashed':
                setMultiplier(round.crashPoint);
                setPlayerBet(null);
                syncTimeoutRef.current = setTimeout(syncGameState, POST_CRASH_DELAY_MS);
                break;
        }

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            stopAnimation();
            stopPlayerSync();
        };
    }, [round, syncGameState, isAutoBetting]);

    // Auto cash out effect
    useEffect(() => {
        if (gameState === 'playing' && playerBet && !hasCashedOutRef.current) {
            const autoCashOutValue = parseFloat(autoCashOut);
            if (autoCashOutValue > 0 && multiplier >= autoCashOutValue) {
                handleCashOut();
            }
        }
    }, [multiplier, gameState, playerBet, autoCashOut]);

    const handlePlaceBet = async () => {
        if (!round || round.status !== 'betting') return;
        
        setIsProcessing(true);
        const amount = parseFloat(betAmount);
        const result = await placeCassinoBet({ stake: amount, roundId: round._id as string });

        if (result.success && result.bet) {
            toast({ title: "Aposta Aceita!" });
            setPlayerBet(result.bet);
            await updateSession();
        } else if(!isAutoBetting) { // Don't toast for auto-bet failures
            toast({ title: "Erro ao Apostar", description: result.message, variant: "destructive" });
        }
        setIsProcessing(false);
    };

    const handleCashOut = async () => {
        if (!playerBet || round?.status !== 'playing' || hasCashedOutRef.current) return;

        hasCashedOutRef.current = true;
        setIsProcessing(true);
        const result = await cashOutCassino(playerBet._id as string, multiplier);

        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPlayerBet(prev => prev ? {...prev, status: 'cashed_out', cashOutMultiplier: multiplier, winnings: result.winnings} : null);
            await updateSession();
        } else {
             toast({ title: "Falha ao Sacar", description: result.message, variant: "destructive" });
             hasCashedOutRef.current = false; // Allow retry if failed
        }
        setIsProcessing(false);
    }
    
    const handleToggleAutoBet = () => {
        if (isAutoBetting) {
            setIsAutoBetting(false);
            roundsLeftRef.current = 0;
            setAutoBetRounds('0');
        } else {
            const rounds = parseInt(autoBetRounds);
            if (rounds > 0) {
                setIsAutoBetting(true);
                roundsLeftRef.current = rounds;
            } else {
                toast({ title: "Valor inválido", description: "Por favor, insira um número de rodadas maior que zero.", variant: "destructive" });
            }
        }
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
                 if (playerBet.status === 'cashed_out' || hasCashedOutRef.current) {
                    return <Button className="w-full h-16 text-xl" variant="outline" disabled>SACADO!</Button>;
                 }
                return <Button className="w-full h-16 text-xl bg-green-500 hover:bg-green-600" onClick={handleCashOut} disabled={isProcessing}>Sacar R$ {(playerBet.stake * multiplier).toFixed(2)}</Button>;

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
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                         <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual</TabsTrigger>
                                <TabsTrigger value="auto">Auto</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="bet-amount">Valor da Aposta (R$)</Label>
                                        <Input id="bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={round?.status !== 'betting' || !!playerBet || isProcessing || isAutoBetting} />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 50, 100, 500].map(amount => (
                                            <Button key={amount} variant="outline" size="sm" onClick={() => setBetAmount(String(amount))} disabled={round?.status !== 'betting' || !!playerBet || isProcessing || isAutoBetting}>
                                                {amount}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="auto" className="p-4">
                               <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="auto-bet-amount">Valor da Aposta</Label>
                                        <Input id="auto-bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={isAutoBetting} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="auto-cashout">Auto Saque (ex: 1.5)</Label>
                                        <Input id="auto-cashout" type="number" placeholder="Opcional" value={autoCashOut} onChange={(e) => setAutoCashOut(e.target.value)} disabled={isAutoBetting} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="auto-rounds">Número de Rodadas</Label>
                                        <Input id="auto-rounds" type="number" placeholder="0" value={autoBetRounds} onChange={(e) => setAutoBetRounds(e.target.value)} disabled={isAutoBetting} />
                                    </div>
                                    <Button onClick={handleToggleAutoBet} className="w-full" variant={isAutoBetting ? "destructive" : "default"}>
                                        {isAutoBetting ? "Parar Auto-Aposta" : "Iniciar Auto-Aposta"}
                                    </Button>
                                </div>
                             </TabsContent>
                        </Tabs>
                        <div className="p-4 border-t">
                            {getButton()}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-3 space-y-6">
                     <Card className="overflow-hidden">
                        <div className="aspect-[16/9] bg-muted/50 rounded-t-lg flex items-center justify-center p-4 relative overflow-hidden">
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <RocketAnimation gameState={gameState} multiplier={multiplier} />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <GameStateDisplay round={round} multiplier={multiplier} hasCashedOut={hasCashedOutRef.current} />
                            </div>
                        </div>
                        <GameHistory games={recentGames} />
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Jogadores na Rodada ({playersInRound.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[300px] overflow-y-auto">
                            <PlayerList players={playersInRound} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
