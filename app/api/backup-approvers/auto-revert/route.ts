import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BackupApproverService } from '@/lib/backup-approver-service';

// POST: Manually trigger backup approver auto-reversion process
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins or system users to trigger this
    // You might want to add role-based access control here
    
    console.log(`Manual backup approver reversion triggered by user ${session.user.id}`);
    
    const result = await BackupApproverService.processExpiredBackupConfigurations();
    
    return NextResponse.json({
      message: 'Backup approver auto-reversion process completed',
      result,
    });
  } catch (error) {
    console.error('Error in manual backup approver reversion:', error);
    return NextResponse.json({ 
      error: 'Failed to process backup approver reversions' 
    }, { status: 500 });
  }
}

// GET: Get upcoming expirations for monitoring
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '7');

    const upcomingExpirations = await BackupApproverService.getUpcomingExpirations(daysAhead);
    
    return NextResponse.json({
      upcomingExpirations,
      daysAhead,
      count: upcomingExpirations.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming expirations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch upcoming expirations' 
    }, { status: 500 });
  }
}