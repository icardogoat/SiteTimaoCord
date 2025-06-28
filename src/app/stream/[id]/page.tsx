
'use client';

import { useEffect, useState } from 'react';
import { getLiveStream } from '@/actions/stream-actions';
import { notFound } from 'next/navigation';
import HlsPlayer from '@/components/hls-player';
import type { LiveStream, StreamSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function StreamPage({ params }: { params: { id: string } }) {
    const [stream, setStream] = useState<LiveStream | null>(null);
    const [activeSource, setActiveSource] = useState<StreamSource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStream() {
            const streamData = await getLiveStream(params.id);
            if (streamData) {
                setStream(streamData);
                if (streamData.sources && streamData.sources.length > 0) {
                    setActiveSource(streamData.sources[0]);
                }
            } else {
                notFound();
            }
            setLoading(false);
        }
        fetchStream();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!stream) {
        return notFound();
    }

    const renderPlayer = () => {
        if (!activeSource) {
            return <div className="w-full h-full flex items-center justify-center text-white bg-black"><p>Nenhuma fonte de transmissão selecionada.</p></div>;
        }

        if (activeSource.type === 'hls') {
            return <HlsPlayer key={activeSource.id} src={activeSource.url} controls autoPlay playsInline className="w-full h-full object-contain" />;
        }

        if (activeSource.type === 'iframe') {
            return <iframe src={activeSource.url} allow="autoplay; encrypted-media" allowFullScreen className="w-full h-full border-0" />;
        }

        return <div className="w-full h-full flex items-center justify-center text-white bg-black"><p>Tipo de fonte inválido.</p></div>;
    };

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            {renderPlayer()}

            {stream.sources.length > 1 && (
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
