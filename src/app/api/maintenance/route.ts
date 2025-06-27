
import { getSiteSettings } from '@/actions/settings-actions';
import { NextResponse } from 'next/server';

// This route is designed to be called from the middleware.
// It has a short revalidation time to ensure the maintenance status is fresh.
export const revalidate = 10; // Revalidate every 10 seconds

export async function GET() {
  try {
    const { maintenanceMode } = await getSiteSettings();
    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    console.error('API route /api/maintenance failed:', error);
    // In case of a database error, default to maintenance being off to prevent locking out the entire site.
    return NextResponse.json({ maintenanceMode: false }, { status: 500 });
  }
}
