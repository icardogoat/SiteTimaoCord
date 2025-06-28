
import { getLiveStream } from '@/actions/stream-actions';
import { LiveStreamOverlay } from '@/components/live-stream-overlay';
import { notFound } from 'next/navigation';

export const revalidate = 10;

export default async function StreamPage({ params }: { params: { id: string } }) {
    const stream = await getLiveStream(params.id);

    if (!stream) {
        notFound();
    }

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            <div 
                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                dangerouslySetInnerHTML={{ __html: stream.embedCode }}
            />
            <LiveStreamOverlay 
                streamId={stream._id.toString()}
                initialAlert={stream.liveAlert} 
                initialPoll={stream.livePoll} 
            />
        </div>
    );
}
