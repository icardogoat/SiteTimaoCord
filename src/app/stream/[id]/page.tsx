
'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { getLiveStream } from '@/actions/stream-actions';
import HlsPlayer from '@/components/hls-player';
import type { LiveStream, StreamSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

export default function StreamPage() {
    const params = useParams<{ id: string }>();
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stream, setStream] = useState<LiveStream | null>(null);
    const [activeSource, setActiveSource] = useState<StreamSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/'); // Redirect to login if not authenticated
            return;
        }

        if (status === 'authenticated') {
            if (!session.user.canViewStream) {
                setLoading(false); // Stop loading, access is denied
                return;
            }

            async function fetchStream() {
                try {
                    const streamData = await getLiveStream(params.id);
                    if (streamData) {
                        setStream(streamData);
                        if (streamData.sources && streamData.sources.length > 0) {
                            // Do not auto-select a source. Let the user choose.
                        }
                    } else {
                        setError('Stream not found');
                    }
                } catch (e) {
                    setError('Failed to load stream');
                } finally {
                    setLoading(false);
                }
            }
            fetchStream();
        }
    }, [status, session, params.id, router]);

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

    const adBlockActive = session?.user?.adRemovalExpiresAt && new Date(session.user.adRemovalExpiresAt) > new Date();

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
                        <p className="mt-4 text-muted-foreground">Selecione uma fonte abaixo para assistir</p>
                    </div>
                </div>
            );
        }

        if (activeSource.type === 'hls') {
            return <HlsPlayer key={activeSource.id} src={activeSource.url} controls autoPlay playsInline className="w-full h-full object-contain" />;
        }

        if (activeSource.type === 'iframe') {
            return <iframe 
                src={activeSource.url} 
                allow="autoplay; encrypted-media; fullscreen" 
                sandbox={adBlockActive ? "allow-scripts allow-fullscreen" : undefined}
                className="w-full h-full border-0" 
            />;
        }

        return <div className="w-full h-full flex items-center justify-center text-white bg-black"><p>Tipo de fonte inválido.</p></div>;
    };

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            {renderPlayer()}

            <div className="absolute top-4 right-4 z-20 pointer-events-none">
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
                 <div className="fixed bottom-0 left-1/2 -translate-x-1/2 p-4 z-50">
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
