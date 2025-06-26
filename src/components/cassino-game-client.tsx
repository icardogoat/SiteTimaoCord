'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
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

const RocketAnimation = ({ gameState, multiplier }: { gameState: GameState; multiplier: number }) => {
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
        <div className="w-full h-full flex flex-col items-center justify-end relative overflow-hidden bg-gradient-to-b from-gray-900 via-indigo-900 to-slate-900">
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


export function CassinoGameClient() {
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
                    <CardDescription>Aposte e saque antes que o foguete exploda!</CardDescription>
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
                        <RocketAnimation gameState={gameState} multiplier={multiplier}/>
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
