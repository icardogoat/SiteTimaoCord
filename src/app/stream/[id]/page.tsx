
import { getLiveStream } from '@/actions/stream-actions';
import { LiveStreamOverlay } from '@/components/live-stream-overlay';
import { notFound } from 'next/navigation';
import HlsPlayer from '@/components/hls-player';

export const revalidate = 10;

export default async function StreamPage({ params }: { params: { id: string } }) {
    const stream = await getLiveStream(params.id);

    if (!stream) {
        notFound();
    }

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            {stream.streamType === 'hls' && stream.streamUrl ? (
                 <HlsPlayer
                    src={stream.streamUrl}
                    controls
                    autoPlay
                    playsInline
                    width="100%"
                    height="100%"
                    className="w-full h-full object-contain"
                />
            ) : stream.streamType === 'iframe' && stream.embedCode ? (
                <div 
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                    dangerouslySetInnerHTML={{ __html: stream.embedCode }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white bg-black">
                    <p>Configuração de transmissão inválida.</p>
                </div>
            )}
            
            <LiveStreamOverlay 
                streamId={stream._id.toString()}
                initialAlert={stream.liveAlert} 
                initialPoll={stream.livePoll} 
            />
        </div>
    );
}
