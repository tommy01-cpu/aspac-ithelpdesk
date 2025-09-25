export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { BackupApproverService } from '@/lib/backup-approver-service';

// This endpoint processes expired backup approver configurations and reverts pending approvals
// Should be called by an external scheduler (e.g., Windows Task Scheduler, cron job, etc.) daily at 6 AM
export async function POST() {
  try {
    console.log('🔄 Starting daily backup approver auto-reversion process...');
    
    const startTime = new Date();
    const result = await BackupApproverService.processExpiredBackupConfigurations();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.log(`✅ Backup approver auto-reversion completed in ${duration}ms`);
    console.log(`📊 Processed ${result.processedConfigs} expired configurations`);
    
    return NextResponse.json({
      success: true,
      message: 'Backup approver auto-reversion process completed successfully',
      data: {
        processedConfigs: result.processedConfigs,
        timestamp: result.timestamp,
        duration: `${duration}ms`,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    console.error('❌ Error in backup approver auto-reversion scheduled task:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process backup approver auto-reversion',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }, { status: 500 });
  }
}

// GET endpoint for health check and manual monitoring
export async function GET() {
  try {
    console.log('🔍 Checking backup approver system status...');
    
    // Get upcoming expirations in the next 7 days
    const upcomingExpirations = await BackupApproverService.getUpcomingExpirations(7);
    
    // Get upcoming expirations in the next 24 hours (for urgent attention)
    const urgentExpirations = await BackupApproverService.getUpcomingExpirations(1);
    
    return NextResponse.json({
      success: true,
      systemStatus: 'healthy',
      upcomingExpirations: {
        next7Days: upcomingExpirations.length,
        next24Hours: urgentExpirations.length,
        urgentConfigs: urgentExpirations.map(config => ({
          id: config.id,
          originalApprover: `${config.original_approver.emp_fname} ${config.original_approver.emp_lname}`,
          backupApprover: `${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname}`,
          endDate: config.end_date,
          hoursRemaining: Math.ceil((new Date(config.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60)),
        })),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('❌ Error checking backup approver system status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check backup approver system status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }, { status: 500 });
  }
}