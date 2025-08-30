import { NextRequest, NextResponse } from 'next/server';
import { safeBackgroundServiceManager } from '@/lib/safe-background-service-manager';

/**
 * Admin API for managing background services
 * GET: Get status of all services
 * POST: Manual trigger or restart services
 */
export async function GET() {
  try {
    const status = safeBackgroundServiceManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...status
    });

  } catch (error) {
    console.error('Error getting service status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get service status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, service } = body;

    let result;

    switch (action) {
      case 'trigger':
        result = await safeBackgroundServiceManager.manualTrigger(service);
        return NextResponse.json({
          success: true,
          action: 'trigger',
          service,
          result
        });

      case 'restart':
        await safeBackgroundServiceManager.restartService(service);
        return NextResponse.json({
          success: true,
          action: 'restart',
          service,
          message: `${service} service restarted`
        });

      case 'status':
        const status = safeBackgroundServiceManager.getSystemStatus();
        return NextResponse.json({
          success: true,
          action: 'status',
          ...status
        });

      case 'shutdown':
        safeBackgroundServiceManager.shutdown();
        return NextResponse.json({
          success: true,
          action: 'shutdown',
          message: 'All services stopped'
        });

      case 'initialize':
        await safeBackgroundServiceManager.initializeAllServices();
        return NextResponse.json({
          success: true,
          action: 'initialize',
          message: 'Services initialized'
        });

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            validActions: ['trigger', 'restart', 'status', 'shutdown', 'initialize']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in background service management:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Service management failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
