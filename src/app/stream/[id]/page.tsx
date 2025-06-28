
'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { getLiveStream } from '@/actions/stream-actions';
import { getBotConfig } from '@/actions/bot-config-actions';
import HlsPlayer from '@/components/hls-player';
import type { LiveStream, StreamSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { IntervalOverlay } from '@/components/interval-overlay';

export default function StreamPage() {
    const params = useParams<{ id: string }>();
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stream, setStream] = useState<LiveStream | null>(null);
    const [activeSource, setActiveSource] = useState<StreamSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [discordInviteUrl, setDiscordInviteUrl] = useState('');

    useEffect(() => {
        async function fetchConfig() {
            try {
                const config = await getBotConfig();
                setDiscordInviteUrl(config.guildInviteUrl || '');
            } catch (e) {
                console.error("Failed to fetch bot config:", e);
            }
        }
        fetchConfig();
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
            return;
        }

        if (status === 'authenticated' && session.user.canViewStream) {
            const fetchStreamData = async () => {
                try {
                    const streamData = await getLiveStream(params.id);
                    if (streamData) {
                        setStream(streamData);
                    } else {
                        setError('Stream not found');
                        if (intervalId) clearInterval(intervalId); // Stop polling if stream not found
                    }
                } catch (e) {
                    setError('Failed to load stream');
                    if (intervalId) clearInterval(intervalId); // Stop polling on error
                } finally {
                    if (loading) setLoading(false);
                }
            };
            
            fetchStreamData(); // Initial fetch
            const intervalId = setInterval(fetchStreamData, 15000);
            return () => clearInterval(intervalId);
        } else if(status === 'authenticated' && !session.user.canViewStream) {
            setLoading(false);
        }
    }, [status, session, params.id, router, loading]);

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <Image
                    src="https://i.imgur.com/xD76hcl.png"
                    alt="FielBet Logo"
                    width={250}
                    height={64}
                    className="animate-pulse"
                    priority
                    data-ai-hint="logo"
                />
            </div>
        );
    }
    
    if (error === 'Stream not found') {
        notFound();
    }
    
    if (error) {
        return (
             <div className="flex items-center justify-center h-screen bg-black text-white">
                <p>Ocorreu um erro ao carregar a transmissão.</p>
            </div>
        );
    }

    if (!session?.user.canViewStream) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Card className="w-full max-w-md text-center">
                    <CardHeader className="items-center">
                        <Lock className="h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4">Acesso Restrito</CardTitle>
                        <CardDescription>Você não tem permissão para visualizar esta transmissão.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/bet')}>Voltar para Apostas</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!stream) {
        return null; // Should be handled by loading/error states
    }

    const renderPlayer = () => {
        if (!activeSource) {
             return (
                <div className="w-full h-full flex items-center justify-center text-white bg-black">
                    <div className="text-center">
                         <Image
                            src="https://i.imgur.com/xD76hcl.png"
                            alt="FielBet Logo"
                            width={250}
                            height={64}
                            className="animate-pulse mx-auto"
                            priority
                            data-ai-hint="logo"
                        />
                        <p className="mt-4 text-muted-foreground">Selecione uma fonte acima para assistir</p>
                    </div>
                </div>
            );
        }

        if (activeSource.type === 'hls') {
            return <HlsPlayer key={activeSource.id} src={activeSource.url} controls autoPlay playsInline muted className="w-full h-full object-contain" />;
        }

        if (activeSource.type === 'iframe') {
            // Common convention for muting embeddable players
            let finalUrl = activeSource.url;
             if (!finalUrl.includes('autoplay=1')) {
                if (finalUrl.includes('?')) {
                    finalUrl += '&autoplay=1';
                } else {
                    finalUrl += '?autoplay=1';
                }
            }
            if (!finalUrl.includes('mute=1')) {
                if (finalUrl.includes('?')) {
                    finalUrl += '&mute=1';
                } else {
                    finalUrl += '?mute=1';
                }
            }
            return <iframe
                src={finalUrl}
                allow="autoplay; encrypted-media; fullscreen; presentation"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
                className="w-full h-full border-0"
            />;
        }

        return <div className="w-full h-full flex items-center justify-center text-white bg-black"><p>Tipo de fonte inválido.</p></div>;
    };
    
    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            {stream.isIntervalActive && <IntervalOverlay discordInviteUrl={discordInviteUrl} />}
            
            <div className={stream.isIntervalActive ? 'hidden' : 'w-full h-full'}>
                {renderPlayer()}
            </div>

            <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <Image
                    src="https://i.imgur.com/xD76hcl.png"
                    alt="FielBet Logo"
                    width={150}
                    height={38}
                    className="opacity-75"
                    data-ai-hint="logo"
                />
            </div>

            {(stream.sources?.length ?? 0) > 1 && (
                 <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                    <Card className="bg-background/80 backdrop-blur-sm">
                        <div className="p-2 flex items-center gap-2">
                            {stream.sources.map(source => (
                                <Button
                                    key={source.id}
                                    variant={activeSource?.id === source.id ? 'default' : 'secondary'}
                                    onClick={() => setActiveSource(source)}
                                >
                                    {source.name}
                                </Button>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
