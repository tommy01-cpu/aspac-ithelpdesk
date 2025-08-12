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

    // Helper: format Date to 'YYYY-MM-DD HH:mm:ss' in Asia/Manila without timezone suffix
    const toManilaString = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const get = (type: string) => parts.find(p => p.type === type)?.value || '';
      const dd = get('day');
      const mm = get('month');
      const yyyy = get('year');
      const HH = get('hour');
      const MM = get('minute');
      const SS = get('second');
      return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
    };

    // Format the history data with PH-local strings
    const formattedHistory = history.map(record => ({
      id: record.id.toString(),
      action: record.action,
      actorName: record.actorName,
      actorType: record.actorType,
      details: record.details || '',
      createdAt: toManilaString(record.timestamp)
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
