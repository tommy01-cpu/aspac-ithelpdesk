import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user ID from session
    const currentUserId = parseInt(session.user.id);
    console.log('GET /api/requests/count - Current User ID:', currentUserId);

    // Simple where clause - only count requests where current user is the requester
    const whereClause = {
      userId: currentUserId
    };

    console.log('COUNT WHERE clause:', JSON.stringify(whereClause, null, 2));

    // Get all requests for the user first
    console.log('🔍 Getting all user requests...');
    const allUserRequests = await prisma.request.findMany({
      where: whereClause,
      include: {
        approvals: {
          select: {
            status: true
          }
        }
      }
    });
    console.log('📋 Total user requests found:', allUserRequests.length);

    // Initialize counts
    let counts = {
      forApproval: 0,
      forClarification: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      onHold: 0,
      overdue: 0,
      total: allUserRequests.length
    };

    // Get current time for overdue calculation
    const now = new Date();

    // Process each request and categorize it
    allUserRequests.forEach((request) => {
      // Check if request is overdue (has SLA due date and it's past, and status is open)
      let isOverdue = false;
      if (request.formData && typeof request.formData === 'object' && request.status === 'open') {
        const formData = request.formData as any;
        if (formData.slaDueDate) {
          try {
            const dueDate = new Date(formData.slaDueDate);
            isOverdue = dueDate < now;
          } catch (error) {
            console.log(`Could not parse due date for request ${request.id}:`, formData.slaDueDate);
          }
        }
      }

      // First check if request has any approval with 'for_clarification' status
      const hasForClarification = request.approvals && request.approvals.some(
        approval => approval.status === 'for_clarification'
      );

      if (hasForClarification) {
        // If it has for_clarification, it goes in For Clarification category ONLY
        counts.forClarification++;
        console.log(`📝 Request ${request.id} -> For Clarification (has approval with for_clarification status)`);
      } else if (isOverdue) {
        // If overdue, count in overdue category
        counts.overdue++;
        console.log(`📝 Request ${request.id} -> Overdue (past due date)`);
      } else {
        // Otherwise, categorize by request status
        switch (request.status) {
          case 'for_approval':
            counts.forApproval++;
            console.log(`📝 Request ${request.id} -> For Approval (status: ${request.status})`);
            break;
          case 'open':
            counts.open++;
            console.log(`📝 Request ${request.id} -> Open (status: ${request.status})`);
            break;
          case 'resolved':
            counts.resolved++;
            console.log(`📝 Request ${request.id} -> Resolved (status: ${request.status})`);
            break;
          case 'closed':
            counts.closed++;
            console.log(`📝 Request ${request.id} -> Closed (status: ${request.status})`);
            break;
          case 'on_hold':
            counts.onHold++;
            console.log(`📝 Request ${request.id} -> On Hold (status: ${request.status})`);
            break;
          default:
            console.log(`📝 Request ${request.id} -> Uncategorized (status: ${request.status})`);
        }
      }
    });

    console.log('📊 Request counts:', counts);

    return NextResponse.json({ 
      success: true, 
      counts
    });
  } catch (error) {
    console.error('Error counting requests:', error);
    
    // Return a more graceful error response
    if (error instanceof Error && error.message.includes('too many clients')) {
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again.', counts: null },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to count requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
