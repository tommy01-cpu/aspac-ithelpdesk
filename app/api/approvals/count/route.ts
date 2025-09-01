import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Define the approval status constants
const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  FOR_CLARIFICATION: 'for_clarification', 
  REJECTED: 'rejected',
  APPROVED: 'approved',
  ACKNOWLEDGED: 'acknowledged'
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user from the database  
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has any approval assignments (instead of checking isServiceApprover flag)
    const potentialApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
        status: {
          in: [APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_STATUS.FOR_CLARIFICATION]
        }
      }
    });

    // If user has no approval assignments, return count 0
    if (potentialApprovals.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Filter approvals to ensure sequential workflow - only count approvals where all previous levels are approved
    const validApprovals = [];
    
    for (const approval of potentialApprovals) {
      // Check if all previous levels are approved
      const previousLevelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: { lt: approval.level } // levels less than current level
        }
      });

      // If there are no previous levels, or all previous levels are approved, include this approval
      const allPreviousApproved = previousLevelApprovals.length === 0 || 
        previousLevelApprovals.every(prevApproval => prevApproval.status === APPROVAL_STATUS.APPROVED);

      if (allPreviousApproved) {
        validApprovals.push(approval);
      }
    }

    // Get unique request IDs to avoid counting multiple approvals for the same request
    const uniqueRequestIds = new Set(validApprovals.map(approval => approval.requestId));
    const uniqueCount = uniqueRequestIds.size;

    return NextResponse.json({ count: uniqueCount });
  } catch (error) {
    console.error('Error fetching approval count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval count' },
      { status: 500 }
    );
  }
}