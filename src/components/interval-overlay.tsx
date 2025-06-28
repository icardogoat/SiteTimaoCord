
'use client';

import { DiscordLogo } from '@/components/icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Link from 'next/link';
import Image from 'next/image';

interface IntervalOverlayProps {
    discordInviteUrl: string;
}

export function IntervalOverlay({ discordInviteUrl }: IntervalOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-sm">
            <audio src="/audio/hino-do-corinthians.mp3" autoPlay loop data-ai-hint="anthem music"></audio>

            <div className="absolute inset-0 bg-[url('https://i.imgur.com/8QZkX4F.jpg')] bg-cover bg-center opacity-10 z-0" data-ai-hint="stadium background"></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
                <Image
                    src="https://i.imgur.com/xD76hcl.png"
                    alt="FielBet Logo"
                    width={400}
                    height={101}
                    className="h-24 w-auto mb-8 animate-pulse"
                    priority
                    data-ai-hint="logo"
                />

                <h1 className="text-4xl font-bold font-headline tracking-tight">Estamos no Intervalo</h1>
                <p className="text-lg text-muted-foreground mt-2">Voltamos em breve com o segundo tempo!</p>
                
                {discordInviteUrl && (
                     <Card className="mt-12 bg-background/50 border-border/50 max-w-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <DiscordLogo className="h-6 w-6" />
                                Junte-se à nossa comunidade
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-muted-foreground">
                                Discuta o jogo, participe de sorteios e muito mais no nosso servidor do Discord!
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                                    Entrar no Servidor
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
