import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define the approval status constants
const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  FOR_CLARIFICATION: 'for_clarification', 
  REJECTED: 'rejected',
  APPROVED: 'approved'
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
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
        status: {
          in: [APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_STATUS.FOR_CLARIFICATION]
        }
      },
      include: {
        request: {
          include: {
            user: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                department: true
              }
            }
          }
        },
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // If user has no approval assignments, return empty array
    if (pendingApprovals.length === 0) {
      return NextResponse.json({ approvals: [] });
    }

    // Format the approvals for the frontend
    const formattedApprovals = pendingApprovals.map(approval => ({
      id: approval.id,
      requestId: approval.request.id,
      requestTitle: approval.request.templateName || `Request #${approval.request.id}`,
      requestType: approval.request.type || 'Request',
      requesterName: `${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`,
      requesterEmail: approval.request.user.emp_email,
      department: approval.request.user.department || 'Unknown',
      createdDate: approval.request.createdAt,
      dueDate: null,
      priority: approval.request.priority,
      status: approval.status,
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      description: (approval.request.formData as any)?.description || ''
    }));

    // Group by requestId to avoid duplicate requests and take the first approval per request
    const uniqueApprovals = [];
    const seenRequestIds = new Set();
    
    for (const approval of formattedApprovals) {
      if (!seenRequestIds.has(approval.requestId)) {
        seenRequestIds.add(approval.requestId);
        uniqueApprovals.push(approval);
      }
    }

    return NextResponse.json({ approvals: uniqueApprovals });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
