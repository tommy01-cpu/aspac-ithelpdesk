import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Get all approvals for this user (using approverId only)
    const userApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: currentUser.id
      },
      select: { id: true }
    });

    const approvalIds = userApprovals.map(approval => approval.id);

    // Mock unread counts for now (will be replaced with real data once Prisma client is fixed)
    const unreadCounts: Record<string, number> = {};
    
    // For testing, let's simulate some unread messages
    if (approvalIds.length > 0) {
      unreadCounts[approvalIds[0].toString()] = 2; // First approval has 2 unread
      if (approvalIds.length > 1) {
        unreadCounts[approvalIds[1].toString()] = 1; // Second approval has 1 unread
      }
    }

    return NextResponse.json({ unreadCounts });
  } catch (error) {
    console.error('Error fetching unread conversation counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
