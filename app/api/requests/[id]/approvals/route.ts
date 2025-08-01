import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Get all approvals for this request
    const approvals = await prisma.requestApproval.findMany({
      where: {
        requestId: requestId
      },
      include: {
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: {
        level: 'asc'
      }
    });

    // Format the approvals data
    const formattedApprovals = approvals.map(approval => ({
      id: approval.id.toString(),
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      approverName: approval.approver 
        ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}`
        : approval.approverEmail || 'Unknown Approver',
      approverEmail: approval.approver?.emp_email || approval.approverEmail || '',
      status: approval.status,
      actedOn: approval.actedOn ? approval.actedOn.toISOString() : null,
      comments: approval.comments
    }));

    return NextResponse.json({ 
      success: true,
      approvals: formattedApprovals 
    });

  } catch (error) {
    console.error('Error fetching request approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request approvals' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
