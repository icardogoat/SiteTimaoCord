
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

type GameState = 'idle' | 'betting' | 'playing' | 'crashed';

const PRE_GAME_DELAY = 3000; // 3 seconds before game starts

const RocketSvg = () => (
    <svg width="80" height="120" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Rocket</title>
        <path d="M18 36C18 36 24 21 12 15C0 21 6 36 6 36H18Z" fill="#F97316"/>
        <path d="M21 23C21 23 23 20 19.5 17.5C16 15 12 15 12 15V26C12 26 17 29 21 23Z" fill="#EAB308"/>
        <path d="M3 23C3 23 1 20 4.5 17.5C8 15 12 15 12 15V26C12 26 7 29 3 23Z" fill="#EAB308"/>
        <path d="M19 18L12 13L5 18V2C5 2 5 0 12 0C19 0 19 2 19 2V18Z" fill="#E2E8F0"/>
        <path d="M12 13L16 18H8L12 13Z" fill="#94A3B8"/>
        <circle cx="12" cy="8" r="3" fill="#3B82F6" stroke="#E2E8F0" strokeWidth="1"/>
    </svg>
);

const Explosion = ({ position }: { position: number }) => (
    <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${position}%` }}>
        <div className="absolute w-24 h-24 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
        <div className="absolute w-32 h-32 bg-orange-500 rounded-full animate-ping opacity-50 [animation-delay:0.1s]"></div>
        <div className="absolute w-16 h-16 bg-red-600 rounded-full animate-ping opacity-60 [animation-delay:0.2s]"></div>
    </div>
);

const RocketAnimation = ({ gameState, multiplier, crashPoint }: { gameState: GameState; multiplier: number; crashPoint: number | null }) => {
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
                     <div className="text-6xl font-bold text-primary drop-shadow-lg transition-opacity">
                        {multiplier.toFixed(2)}x
                     </div>
                )}
                 {gameState === 'crashed' && crashPoint && (
                     <div className="text-6xl font-bold text-destructive drop-shadow-lg transition-opacity">
                        {crashPoint.toFixed(2)}x
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
    
    const [betAmount, setBetAmount] = useState('10');
    const [autoCashOut, setAutoCashOut] = useState('');
    const [gameState, setGameState] = useState<GameState>('idle');
    const [multiplier, setMultiplier] = useState(1.00);
    const [activeBetId, setActiveBetId] = useState<string | null>(null);
    const [crashPoint, setCrashPoint] = useState<number | null>(null);
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

    const handleCashOut = async () => {
        if (!activeBetId || gameStateRef.current !== 'playing') return;
        
        stopGame();
        
        const result = await cashOutCassino(activeBetId, multiplier);
        if(result.success) {
            toast({ title: "Sucesso!", description: result.message });
            await updateSession();
            setGameState('idle');
        } else {
            toast({ title: "Que pena!", description: result.message, variant: "destructive" });
            if (result.crashPoint) {
                setMultiplier(result.crashPoint);
                setRecentGames(prev => [...prev.slice(-14), { crashPoint: result.crashPoint! }])
            }
            setGameState('crashed');
        }
        
        setActiveBetId(null);
        setCrashPoint(null);
    };

    useEffect(() => {
        if (gameState === 'playing' && crashPoint && activeBetId) {
            const startTime = Date.now();
            
            intervalRef.current = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const newMultiplier = parseFloat((1 * Math.pow(1.00008, elapsedTime)).toFixed(2));
                
                const autoCashOutValue = parseFloat(autoCashOut);
                if (!isNaN(autoCashOutValue) && autoCashOutValue > 1 && newMultiplier >= autoCashOutValue) {
                    handleCashOut();
                } else if (newMultiplier >= crashPoint) {
                    stopGame();
                    setMultiplier(crashPoint);
                    setGameState('crashed');
                    cashOutCassino(activeBetId, crashPoint);
                    setRecentGames(prev => [...prev.slice(-14), { crashPoint: crashPoint! }])
                } else {
                    setMultiplier(newMultiplier);
                }
            }, 50);

        } else if (gameState === 'crashed' || gameState === 'idle') {
            stopGame();
        }

        return () => stopGame();
    }, [gameState, crashPoint, activeBetId, autoCashOut]);

    const handleStartGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Valor inválido", variant: "destructive" });
            return;
        }
        
        if (session?.user && amount > session.user.balance) {
             toast({ title: "Saldo insuficiente", variant: "destructive" });
            return;
        }

        setGameState('betting');
        setMultiplier(1.00);

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
        }
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
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Foguetinho FielBet</h1>
                <p className="text-muted-foreground">Aposte e saque antes que o foguete exploda!</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 lg:order-1">
                    <CardHeader><CardTitle>Painel de Controle</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bet-amount">Valor da Aposta (R$)</Label>
                            <Input 
                                id="bet-amount"
                                type="number" 
                                value={betAmount} 
                                onChange={(e) => setBetAmount(e.target.value)}
                                disabled={gameState !== 'idle' && gameState !== 'crashed'}
                                className="h-12 text-lg"
                            />
                             <div className="flex gap-2 pt-1">
                                {quickBetAmounts.map(amount => (
                                    <Button key={amount} variant="outline" size="sm" onClick={() => setBetAmount(String(amount))}  disabled={gameState !== 'idle' && gameState !== 'crashed'}>
                                        {amount}
                                    </Button>
                                ))}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="auto-cashout">Auto Saque (Opcional)</Label>
                            <Input 
                                id="auto-cashout"
                                type="number" 
                                placeholder="Ex: 2.00"
                                value={autoCashOut}
                                onChange={(e) => setAutoCashOut(e.target.value)}
                                disabled={gameState !== 'idle' && gameState !== 'crashed'}
                            />
                            <p className="text-xs text-muted-foreground">O jogo irá sacar automaticamente neste multiplicador.</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        {getButton()}
                    </CardFooter>
                </Card>

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
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
