import { NextResponse } from 'next/server';
import { checkConnectionHealth } from '@/lib/prisma';

export async function GET() {
  try {
    const health = checkConnectionHealth();
    
    return NextResponse.json({
      status: 'ok',
      connectionPool: health,
      timestamp: new Date().toISOString(),
      recommendations: health.activeConnections > 5 ? [
        'High connection usage detected',
        'Consider implementing connection pooling',
        'Check for unclosed connections',
        'Monitor for concurrent heavy operations'
      ] : []
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
