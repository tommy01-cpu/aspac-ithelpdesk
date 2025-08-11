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

export async function POST(
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

    const { users } = await request.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'No users provided' }, { status: 400 });
    }

    // Get the current user
    const currentUser = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify that the request exists
    const existingRequest = await prisma.requests.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Prepare approval data
    const approvalData = users.map(user => ({
      requestId: requestId,
      approverId: user.userId,
      level: user.level,
      name: user.name,
      approverEmail: user.email,
      status: 'pending_approval' as const,
      sentOn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Create the approvals in a transaction
    const newApprovals = await prisma.$transaction(async (tx) => {
      // Create all approvals
      const createdApprovals = await Promise.all(
        approvalData.map(data => 
          tx.requestApproval.create({
            data,
            include: {
              approver: {
                select: {
                  emp_fname: true,
                  emp_lname: true,
                  emp_email: true
                }
              }
            }
          })
        )
      );

      // Log the action in request history
      await tx.requestHistory.create({
        data: {
          requestId: requestId,
          action: 'approvals_added',
          details: `Added ${users.length} approver(s) to Level ${users[0].level}`,
          changedBy: currentUser.id,
          changedAt: new Date()
        }
      });

      return createdApprovals;
    });

    // Format the response
    const formattedApprovals = newApprovals.map(approval => ({
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
      message: `Successfully added ${newApprovals.length} approver(s)`,
      approvals: formattedApprovals
    });

  } catch (error) {
    console.error('Error adding request approvals:', error);
    return NextResponse.json(
      { error: 'Failed to add request approvals' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
