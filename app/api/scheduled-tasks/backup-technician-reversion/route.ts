export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { BackupTechnicianService } from '@/lib/backup-technician-service';

// This endpoint processes expired backup technician configurations and reverts assigned requests
// Should be called by an external scheduler (e.g., Windows Task Scheduler, cron job, etc.) daily at 6 AM
export async function POST() {
  try {
    console.log('🔄 Starting daily backup technician auto-reversion process...');
    
    const startTime = new Date();
    const result = await BackupTechnicianService.processExpiredBackupConfigurations();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.log(`✅ Backup technician auto-reversion completed in ${duration}ms`);
    console.log(`📊 Processed ${result.processedConfigs} expired configurations`);
    console.log(`📋 Reverted ${result.totalRevertedRequests} requests back to original technicians`);
    
    return NextResponse.json({
      success: true,
      message: 'Backup technician auto-reversion process completed successfully',
      data: {
        processedConfigs: result.processedConfigs,
        totalRevertedRequests: result.totalRevertedRequests,
        timestamp: result.timestamp,
        duration: `${duration}ms`,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    console.error('❌ Error in backup technician auto-reversion scheduled task:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process backup technician auto-reversion',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }, { status: 500 });
  }
}

// GET endpoint for health check and manual monitoring
export async function GET() {
  try {
    console.log('🔍 Checking backup technician system status...');
    
    // Get upcoming expirations in the next 7 days
    const upcomingExpirations = await BackupTechnicianService.getUpcomingExpirations(7);
    
    // Get upcoming expirations in the next 24 hours (for urgent attention)
    const urgentExpirations = await BackupTechnicianService.getUpcomingExpirations(1);
    
    return NextResponse.json({
      success: true,
      systemStatus: 'healthy',
      upcomingExpirations: {
        next7Days: upcomingExpirations.length,
        next24Hours: urgentExpirations.length,
        urgentConfigs: urgentExpirations.map((config: any) => ({
          id: config.id,
          originalTechnician: `${config.original_technician.emp_fname} ${config.original_technician.emp_lname}`,
          backupTechnician: `${config.backup_technician.emp_fname} ${config.backup_technician.emp_lname}`,
          endDate: config.end_date,
          hoursRemaining: Math.ceil((new Date(config.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60)),
        })),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('❌ Error checking backup technician system status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check backup technician system status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }, { status: 500 });
  }
}