export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
    const currentUser = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all requests where the user is the requester
    const userRequests = await prisma.request.findMany({
      where: { userId: currentUser.id },
      include: {
        approvals: {
          select: { id: true }
        }
      }
    });

    const approvalIds = userRequests.flatMap(request => 
      request.approvals.map(approval => approval.id)
    );

    const unreadCounts: Record<string, number> = {};

    // For each approval, count unread messages from approvers
    try {
      for (const approvalId of approvalIds) {
        const unreadMessages = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM approval_conversations ac
          WHERE ac."approvalId" = ${approvalId}
          AND ac.type = 'approver'
          AND NOT (ac."readBy" ? ${currentUser.id}::text)
        ` as any[];

        const count = parseInt(unreadMessages[0]?.count || '0');
        if (count > 0) {
          unreadCounts[approvalId.toString()] = count;
        } else {
          unreadCounts[approvalId.toString()] = 0;
        }
      }
    } catch (dbError) {
      console.log('DB Error fetching unread counts - using fallback:', dbError);
      // Set all counts to 0 as fallback
      approvalIds.forEach(id => {
        unreadCounts[id.toString()] = 0;
      });
    }

    return NextResponse.json({ unreadCounts });
  } catch (error) {
    console.error('Error fetching unread conversation counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    );
  }
}
