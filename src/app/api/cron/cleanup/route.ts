
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const message = `Cassino cleanup job is disabled.`;
  console.log(message);
  return NextResponse.json({ success: true, message });
}
