'use server';

import { getLiveStream, voteOnPoll } from '@/actions/stream-actions';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const revalidate = 0; // Ensure fresh data on every request

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stream = await getLiveStream(params.id);
        if (!stream) {
            return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
        }
        
        // Return only the live elements to the client
        return NextResponse.json({ 
            liveAlert: stream.liveAlert, 
            livePoll: stream.livePoll 
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await request.json();
        if (!body.optionId) {
            return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
        }

        const result = await voteOnPoll(params.id, body.optionId, session.user.discordId);

        if (result.success) {
            return NextResponse.json({ message: result.message });
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
