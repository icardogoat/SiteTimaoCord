
import { NextResponse } from 'next/server';
import { deleteOldNews } from '@/actions/news-actions';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const newsResult = await deleteOldNews();
  
  // The casino cleanup is disabled, so we just return the news result.
  const message = `Cleanup jobs finished. News: ${newsResult.message}`;
  console.log(message);
  return NextResponse.json({ success: newsResult.success, message });
}
