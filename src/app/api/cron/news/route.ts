
import { NextResponse } from 'next/server';

// This cron job is deprecated as news fetching is now manual.
// It's kept to avoid breaking existing cron job setups.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return NextResponse.json({ success: true, message: "News cron job is deprecated and no longer performs any action." });
}
