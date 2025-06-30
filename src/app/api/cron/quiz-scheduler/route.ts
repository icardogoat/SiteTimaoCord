
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Quiz } from '@/types';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const quizzesCollection = db.collection<Quiz>('quizzes');
    const quizCommandsCollection = db.collection('quiz_commands');

    // Get current time in São Paulo
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentDay = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().substring(0, 5); // HH:mm

    // Find quizzes scheduled for the current time
    const scheduledQuizzes = await quizzesCollection.find({
      schedule: currentTime,
    }).toArray();

    if (scheduledQuizzes.length === 0) {
      return NextResponse.json({ success: true, message: 'No quizzes to trigger at this time.' });
    }
    
    let triggeredCount = 0;
    const details: string[] = [];

    for (const quiz of scheduledQuizzes) {
        // Check if this specific schedule was already triggered today
        const lastTrigger = (quiz as any).lastScheduledTriggers?.[currentTime];
        if (lastTrigger === currentDay) {
            details.push(`Quiz '${quiz.name}' for ${currentTime} already triggered today. Skipping.`);
            continue;
        }

        // Add to command queue for the bot to pick up
        await quizCommandsCollection.insertOne({
            quizId: quiz._id,
            createdAt: new Date(),
        });

        // Mark as triggered for today to prevent duplicates
        await quizzesCollection.updateOne(
            { _id: quiz._id },
            { $set: { [`lastScheduledTriggers.${currentTime}`]: currentDay } }
        );
        
        triggeredCount++;
        details.push(`Triggered quiz '${quiz.name}' for ${currentTime}.`);
    }

    return NextResponse.json({ 
        success: true, 
        message: `Cron job ran. Triggered ${triggeredCount} quiz(es).`,
        details 
    });

  } catch (error) {
    console.error('Cron job for quiz scheduler failed:', error);
    return NextResponse.json({ success: false, message: 'Cron job failed', error: (error as Error).message }, { status: 500 });
  }
}
