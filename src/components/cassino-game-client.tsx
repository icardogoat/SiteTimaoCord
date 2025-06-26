
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { placeCassinoBet, cashOutCassino } from '@/actions/cassino-actions';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';


type GameState = 'idle' | 'betting' | 'playing' | 'crashed';

const PRE_GAME_DELAY = 3000; // 3 seconds before game starts
const POST_CRASH_DELAY = 3000; // 3 seconds after crash before going idle

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

const RocketAnimation = ({ gameState, multiplier, crashPoint, hasCashedOut }: { gameState: GameState; multiplier: number; crashPoint: number | null, hasCashedOut: boolean }) => {
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
        const progress = Math.log1p(multiplier - 0.9) / Math.log1p(50);
        return 5 + Math.min(progress, 1) * 80;
    };
    
    const rocketPosition = getRocketPosition();

    return (
        <div className="w-full h-full flex flex-col items-center justify-end relative overflow-hidden bg-slate-900 rounded-lg">
            {/* Stars */}
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
            
            {/* Display Text */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                {gameState === 'playing' && (
                     <div className={cn(
                        "text-6xl font-bold drop-shadow-lg transition-colors",
                        hasCashedOut ? 'text-green-400' : 'text-primary'
                     )}>
                        {multiplier.toFixed(2)}x
                     </div>
                )}
                 {gameState === 'crashed' && crashPoint && (
                     <div className="text-6xl font-bold text-destructive drop-shadow-lg transition-opacity">
                        {crashPoint.toFixed(2)}x
                     </div>
                )}
                 {gameState === 'betting' && (
                     <div className="text-4xl font-bold text-primary drop-shadow-lg">
                        Começando em breve...
                     </div>
                )}
            </div>

            {gameState !== 'crashed' && (
                <div
                    className={cn(
                        'absolute z-10 transition-all duration-100 ease-linear',
                        gameState === 'playing' && 'animate-rocket-shake'
                    )}
                    style={{ bottom: `${rocketPosition}%`, left: 'calc(50% - 40px)' }}
                >
                    <RocketSvg />
                </div>
            )}
            
            {gameState === 'crashed' && <Explosion position={rocketPosition} />}
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


export function CassinoGameClient({ initialRecentGames }: { initialRecentGames: { crashPoint: number }[] }) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    
    // Game controls state
    const [betAmount, setBetAmount] = useState('10');
    const [autoCashOut, setAutoCashOut] = useState('');
    
    // Game logic state
    const [gameState, setGameState] = useState<GameState>('idle');
    const [multiplier, setMultiplier] = useState(1.00);
    const [activeBetId, setActiveBetId] = useState<string | null>(null);
    const [crashPoint, setCrashPoint] = useState<number | null>(null);
    const [hasCashedOut, setHasCashedOut] = useState(false);
    
    // Auto-bet state
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    const [autoBetRounds, setAutoBetRounds] = useState('5');
    const [remainingRounds, setRemainingRounds] = useState(0);

    // History state
    const [recentGames, setRecentGames] = useState(initialRecentGames);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState }, [gameState]);

    const stopGame = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };
    
    const handleRoundEnd = () => {
        if (gameStateRef.current !== 'playing') return;
        
        stopGame();
        setGameState('crashed');

        if(crashPoint) {
            setRecentGames(prev => [...prev.slice(-14), { crashPoint: crashPoint }])
        
            if (activeBetId && !hasCashedOut) {
                // If user was in the game and didn't cash out, register the loss.
                cashOutCassino(activeBetId, crashPoint);
            }
        }
    };


    const handleCashOut = async () => {
        if (!activeBetId || gameStateRef.current !== 'playing' || hasCashedOut) return;
        
        setHasCashedOut(true); 
        
        const result = await cashOutCassino(activeBetId, multiplier);
        if(result.success) {
            toast({ title: "Sucesso!", description: result.message });
            await updateSession();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
    };

     // Main Game Loop Effect
    useEffect(() => {
        if (gameState === 'playing' && crashPoint) {
            const startTime = Date.now();
            
            intervalRef.current = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const newMultiplier = parseFloat((1 * Math.pow(1.00008, elapsedTime)).toFixed(2));
                
                const autoCashOutValue = parseFloat(autoCashOut);
                if (!hasCashedOut && !isNaN(autoCashOutValue) && autoCashOutValue > 1 && newMultiplier >= autoCashOutValue) {
                    setMultiplier(autoCashOutValue);
                    handleCashOut();
                } else if (newMultiplier >= crashPoint) {
                    setMultiplier(crashPoint);
                    handleRoundEnd();
                } else {
                    setMultiplier(newMultiplier);
                }
            }, 50);

        } else if (gameState === 'crashed') {
            const timer = setTimeout(() => {
                setGameState('idle');
                // Reset states for next round
                setActiveBetId(null);
                setCrashPoint(null);
            }, POST_CRASH_DELAY);
            return () => clearTimeout(timer);
        }

        return () => stopGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, crashPoint]);
    
     // Auto-Bet Loop Effect
    useEffect(() => {
        if (isAutoBetting && gameState === 'idle' && remainingRounds > 0) {
            handleStartGame();
            setRemainingRounds(r => r - 1);
        } else if (isAutoBetting && gameState === 'idle' && remainingRounds <= 0) {
            setIsAutoBetting(false);
            toast({ title: "Auto-Aposta Concluída" });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAutoBetting, gameState, remainingRounds]);


    const handleStartGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Valor inválido", variant: "destructive" });
            return;
        }
        
        if (session?.user && amount > session.user.balance) {
             toast({ title: "Saldo insuficiente", variant: "destructive" });
             setIsAutoBetting(false);
             setRemainingRounds(0);
            return;
        }

        setGameState('betting');
        setMultiplier(1.00);
        setHasCashedOut(false);

        const payload = {
            stake: amount,
            autoCashOutAt: parseFloat(autoCashOut) || undefined,
        }

        const result = await placeCassinoBet(payload);
        if (result.success && result.betId && result.crashPoint) {
            await updateSession();
            setActiveBetId(result.betId);
            setCrashPoint(result.crashPoint);
            setTimeout(() => {
                if (gameStateRef.current === 'betting') {
                    setGameState('playing');
                }
            }, PRE_GAME_DELAY);
        } else {
            toast({ title: "Erro ao iniciar", description: result.message, variant: "destructive" });
            setGameState('idle');
            setIsAutoBetting(false);
        }
    };
    
    const handleAutoBetToggle = () => {
        if (isAutoBetting) {
            setIsAutoBetting(false);
            setRemainingRounds(0);
            toast({ title: "Auto-Aposta Parada" });
        } else {
            const rounds = parseInt(autoBetRounds, 10);
            if (isNaN(rounds) || rounds <= 0) {
                toast({ title: "Número de rodadas inválido.", variant: "destructive" });
                return;
            }
            setIsAutoBetting(true);
            setRemainingRounds(rounds);
            toast({ title: `Auto-Aposta iniciada para ${rounds} rodadas.` });
        }
    };
    
    const getButton = () => {
        switch (gameState) {
            case 'idle':
                return <Button className="w-full h-16 text-xl" onClick={handleStartGame}>Apostar</Button>;
            case 'betting':
                return <Button className="w-full h-16 text-xl" variant="secondary" disabled><Loader2 className="mr-2 h-6 w-6 animate-spin" />Aguardando...</Button>;
            case 'playing':
                 if (hasCashedOut) {
                    return <Button className="w-full h-16 text-xl" variant="outline" disabled>SACADO!</Button>;
                }
                return <Button className="w-full h-16 text-xl" variant="destructive" onClick={handleCashOut}>Sacar R$ {(parseFloat(betAmount) * multiplier).toFixed(2)}</Button>;
            case 'crashed':
                return <Button className="w-full h-16 text-xl" onClick={handleStartGame}>Jogar Novamente</Button>;
        }
    }
    
    const getAutoBetButton = () => {
        if (isAutoBetting) {
            return <Button className="w-full h-16 text-xl" variant="destructive" onClick={handleAutoBetToggle}>Parar Auto-Aposta ({remainingRounds})</Button>;
        }
        if (gameState === 'idle') {
            return <Button className="w-full h-16 text-xl" onClick={handleAutoBetToggle}>Iniciar Auto-Aposta</Button>;
        }
        return <Button className="w-full h-16 text-xl" disabled>Aguarde a rodada terminar</Button>;
    };

    const isBettingDisabled = (gameState !== 'idle' && gameState !== 'crashed') || isAutoBetting;
    
    const quickBetAmounts = [10, 20, 50, 100];

    const manualBettingPanel = (
        <>
            <CardHeader><CardTitle>Aposta Manual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="bet-amount">Valor da Aposta (R$)</Label>
                    <Input id="bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={isBettingDisabled} className="h-12 text-lg" />
                    <div className="flex gap-2 pt-1">
                        {quickBetAmounts.map(amount => (
                            <Button key={amount} variant="outline" size="sm" onClick={() => setBetAmount(String(amount))}  disabled={isBettingDisabled}>
                                {amount}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="auto-cashout">Auto Saque (Opcional)</Label>
                    <Input id="auto-cashout" type="number" placeholder="Ex: 2.00" value={autoCashOut} onChange={(e) => setAutoCashOut(e.target.value)} disabled={isBettingDisabled} />
                </div>
            </CardContent>
            <CardFooter>{getButton()}</CardFooter>
        </>
    );

     const autoBettingPanel = (
        <>
            <CardHeader><CardTitle>Aposta Automática</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="auto-bet-amount">Valor da Aposta (R$)</Label>
                    <Input id="auto-bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={isAutoBetting} className="h-12 text-lg" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="auto-bet-cashout">Auto Saque</Label>
                    <Input id="auto-bet-cashout" type="number" placeholder="Ex: 2.00" value={autoCashOut} onChange={(e) => setAutoCashOut(e.target.value)} disabled={isAutoBetting} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="auto-bet-rounds">Número de Rodadas</Label>
                    <Input id="auto-bet-rounds" type="number" value={autoBetRounds} onChange={(e) => setAutoBetRounds(e.target.value)} disabled={isAutoBetting} />
                </div>
            </CardContent>
            <CardFooter>{getAutoBetButton()}</CardFooter>
        </>
    );

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Foguetinho FielBet</h1>
                <p className="text-muted-foreground">Aposte e saque antes que o foguete exploda!</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 lg:order-1">
                    <Tabs defaultValue="manual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="manual" disabled={isAutoBetting}>Manual</TabsTrigger>
                            <TabsTrigger value="auto" disabled={gameState !== 'idle'}>Auto</TabsTrigger>
                        </TabsList>
                        <TabsContent value="manual">
                            <Card>{manualBettingPanel}</Card>
                        </TabsContent>
                        <TabsContent value="auto">
                            <Card>{autoBettingPanel}</Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="lg:col-span-2 lg:order-2">
                    <Card>
                        <CardContent className="p-2 space-y-2">
                            <GameHistory games={recentGames} />
                            <Separator />
                            <div className="aspect-[16/10] bg-muted/50 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                                <RocketAnimation 
                                    gameState={gameState} 
                                    multiplier={multiplier}
                                    crashPoint={crashPoint}
                                    hasCashedOut={hasCashedOut}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
