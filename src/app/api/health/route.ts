import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    // Only log full error in development
    if (isDev) {
      console.error('Health check failed:', error);
    }
    
    // In production, don't expose error details
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        // Only expose error details in development
        ...(isDev && { error: error instanceof Error ? error.message : 'Unknown error' }),
      },
      { status: 503 }
    );
  }
}
