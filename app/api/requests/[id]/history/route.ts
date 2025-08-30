import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Get the current user
    const currentUser = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all history records for this request
    const history = await prisma.requestHistory.findMany({
      where: {
        requestId: requestId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Helper: format timestamp that's already in Philippine time
    // Since we store Philippine time directly, we don't need timezone conversion
    const formatStoredPhilippineTime = (d: Date) => {
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    // Format the history data - timestamps are already in Philippine time
    const formattedHistory = history.map(record => ({
      id: record.id.toString(),
      action: record.action,
      actorName: record.actorName,
      actorType: record.actorType,
      details: record.details || '',
      createdAt: formatStoredPhilippineTime(record.timestamp)
    }));

    return NextResponse.json({ 
      success: true,
      history: formattedHistory 
    });

  } catch (error) {
    console.error('Error fetching request history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request history' },
      { status: 500 }
    );
  }
}
