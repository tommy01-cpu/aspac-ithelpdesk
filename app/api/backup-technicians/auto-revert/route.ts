import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackupTechnicianService } from '@/lib/backup-technician-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only allow admins or system users to trigger this
    // You might want to add role-based access control here
    
    console.log(`Manual backup technician reversion triggered by user ${session.user.id}`);
    
    const result = await BackupTechnicianService.processExpiredBackupConfigurations();
    
    return NextResponse.json({
      success: true,
      message: 'Backup technician auto-reversion process completed',
      result: {
        processedConfigs: result.processedConfigs,
        totalRevertedRequests: result.totalRevertedRequests,
        message: `Processed ${result.processedConfigs} expired configurations and reverted ${result.totalRevertedRequests} requests`
      }
    });
  } catch (error) {
    console.error('Error in manual backup technician reversion:', error);
    return NextResponse.json({ 
      error: 'Failed to process backup technician reversions' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '7');

    const upcomingExpirations = await BackupTechnicianService.getUpcomingExpirations(daysAhead);
    
    return NextResponse.json({
      upcomingExpirations,
      daysAhead,
      count: upcomingExpirations.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming technician expirations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch upcoming expirations' 
    }, { status: 500 });
  }
}