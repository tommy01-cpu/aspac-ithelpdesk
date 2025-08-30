import { NextRequest, NextResponse } from 'next/server';
import { safeApprovalReminderService } from '@/lib/safe-approval-reminder-service';

/**
 * API endpoint for managing approval reminder service
 * Supports GET (status), POST (manual trigger), and DELETE (stop service)
 */
export async function GET() {
  try {
    const result = await safeApprovalReminderService.sendDailyReminders();
    
    return NextResponse.json({
      success: true,
      service: { isRunning: result.success },
      approvalStats: result.results || {},
      message: result.success 
        ? 'Safe approval reminder service completed successfully'
        : 'Safe approval reminder service encountered issues'
    });
  } catch (error) {
    console.error('Error getting approval reminder status:', error);
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

/**
 * Manual trigger for approval reminders (for testing)
 */
export async function POST() {
  try {
    console.log('📧 Manual approval reminder triggered via API');
    const result = await safeApprovalReminderService.sendDailyReminders();
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Approval reminders sent successfully' : 'Failed to send reminders',
      results: result.results,
      error: result.error
    });
  } catch (error) {
    console.error('Error triggering manual approval reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send approval reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Stop the approval reminder service
 */
export async function DELETE() {
  try {
    // Safe service doesn't need to be stopped - it runs per request
    return NextResponse.json({
      success: true,
      message: 'Safe approval reminder service - no persistent service to stop'
    });
  } catch (error) {
    console.error('Error stopping approval reminder service:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to stop service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
