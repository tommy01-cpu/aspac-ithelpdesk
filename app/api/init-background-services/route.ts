import { NextResponse } from 'next/server';
import { safeBackgroundServiceManager } from '@/lib/safe-background-service-manager';

export async function GET() {
  try {
    console.log('🔧 Manual initialization of background services triggered...');
    
    // Force initialize background services
    await safeBackgroundServiceManager.initializeAllServices();
    
    const status = safeBackgroundServiceManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Background services initialized',
      status
    });
  } catch (error) {
    console.error('Failed to initialize background services:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize background services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
