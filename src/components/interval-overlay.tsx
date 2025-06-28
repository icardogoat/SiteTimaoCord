
'use client';

import { DiscordLogo } from '@/components/icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getDisplayAdvertisements } from '@/actions/ad-actions';
import type { Advertisement } from '@/types';

interface IntervalOverlayProps {
    discordInviteUrl: string;
}

const DiscordInviteCard = ({ discordInviteUrl }: { discordInviteUrl: string }) => {
    if (!discordInviteUrl) return null;
    return (
        <Card className="mt-12 bg-background/50 border-border/50 max-w-sm w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <DiscordLogo className="h-6 w-6" />
                    Junte-se à nossa comunidade
                </CardTitle>
            </CardHeader>
            <CardContent>
                    <p className="text-muted-foreground text-center">
                    Discuta o jogo, participe de sorteios e muito mais no nosso servidor do Discord!
                </p>
                <Button asChild className="mt-4 w-full">
                    <Link href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                        Entrar no Servidor
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

const AdCard = ({ ad }: { ad: Advertisement }) => (
    <Link href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block max-w-sm w-full">
        <Card className="mt-12 bg-background/50 border-border/50 group overflow-hidden">
            <div className="relative">
                 <Image
                    src={ad.imageUrl}
                    alt={ad.title}
                    width={400}
                    height={200}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint="advertisement banner"
                />
            </div>
            <CardHeader>
                <CardTitle>{ad.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground line-clamp-2">{ad.description}</p>
            </CardContent>
        </Card>
    </Link>
);


export function IntervalOverlay({ discordInviteUrl }: IntervalOverlayProps) {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    useEffect(() => {
        getDisplayAdvertisements().then(fetchedAds => {
            if (fetchedAds.length > 0) {
                setAds(fetchedAds);
                setCurrentAdIndex(Math.floor(Math.random() * fetchedAds.length));
            }
        });
    }, []);

    // Rotate ad every 5 seconds
    useEffect(() => {
        if (ads.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAdIndex(prev => (prev + 1) % ads.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [ads]);

    const adToDisplay = ads.length > 0 ? ads[currentAdIndex] : null;

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
                
                {adToDisplay ? (
                    <AdCard ad={adToDisplay} />
                ) : (
                    <DiscordInviteCard discordInviteUrl={discordInviteUrl} />
                )}
            </div>
        </div>
    );
}
