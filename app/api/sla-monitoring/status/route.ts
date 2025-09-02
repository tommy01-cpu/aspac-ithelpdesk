import { NextRequest, NextResponse } from 'next/server';
import { safeSLAMonitoringService } from '@/lib/safe-sla-monitoring-service';

/**
 * GET /api/sla-monitoring/status
 * Check if SLA monitoring service is running
 */
export async function GET(request: NextRequest) {
  try {
    // Get basic status
    const basicStatus = safeSLAMonitoringService.getStatus();
    
    // Get detailed health check
    const healthCheck = await safeSLAMonitoringService.getHealthCheck();

    return NextResponse.json({
      success: true,
      data: {
        basic: basicStatus,
        health: healthCheck,
        service: {
          name: 'Safe SLA Monitoring Service',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });

  } catch (error) {
    console.error('Error checking SLA monitoring status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check service status',
      details: error instanceof Error ? error.message : 'Unknown error',
      data: {
        basic: { isProcessing: false, isAutoClosing: false },
        health: { 
          status: 'error',
          database: { connected: false },
          timestamp: new Date().toISOString()
        }
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/sla-monitoring/status
 * Manual trigger for SLA monitoring (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    let result;
    
    switch (action) {
      case 'trigger-sla':
        result = await safeSLAMonitoringService.manualTriggerSLA();
        break;
        
      case 'trigger-autoclose':
        result = await safeSLAMonitoringService.manualTriggerAutoClose();
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "trigger-sla" or "trigger-autoclose"'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      triggeredAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering SLA monitoring:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
