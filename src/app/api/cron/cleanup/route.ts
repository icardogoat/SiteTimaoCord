
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('timaocord');
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Cleanup cassino_game_round
    const roundsCollection = db.collection('cassino_game_round');
    const oldRoundsResult = await roundsCollection.deleteMany({
      bettingEndsAt: { $lt: oneDayAgo }
    });
    
    // Cleanup cassino_bets
    const betsCollection = db.collection('cassino_bets');
    const oldBetsResult = await betsCollection.deleteMany({
      createdAt: { $lt: oneDayAgo }
    });

    const message = `Cleanup successful. Deleted ${oldRoundsResult.deletedCount} old game rounds and ${oldBetsResult.deletedCount} old cassino bets.`;
    console.log(message);

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Cron job for cleanup failed:', error);
    return NextResponse.json({ success: false, message: 'Cron job failed', error: (error as Error).message }, { status: 500 });
  }
}
