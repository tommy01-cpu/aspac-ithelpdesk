import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addHistory } from '@/lib/history';
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
      // en-GB gives dd/mm/yyyy, convert to yyyy-mm-dd
      return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
    };

    // Format the approvals data
    const formattedApprovals = approvals.map(approval => ({
      id: approval.id.toString(),
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      approverId: approval.approverId,
      approverName: approval.approver 
        ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}`
        : approval.approverEmail || 'Unknown Approver',
      approverEmail: approval.approver?.emp_email || approval.approverEmail || '',
      status: approval.status,
      sentOn: approval.sentOn ? toManilaString(approval.sentOn) : null,
      actedOn: approval.actedOn ? toManilaString(approval.actedOn) : null,
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
  const existingRequest = await prisma.request.findUnique({
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
    }));

    // Create the approvals in a transaction
    const newApprovals = await prisma.$transaction(async (tx) => {
      // Create all approvals
      const createdApprovals = await Promise.all(
        approvalData.map(async (data) => {
          const created = await tx.requestApproval.create({
            data: {
              ...data,
              status: 'pending_approval',
            },
            include: {
              approver: {
                select: {
                  emp_fname: true,
                  emp_lname: true,
                  emp_email: true
                }
              }
            }
          });
          // Force timestamps to Asia/Manila for createdAt/sentOn/updatedAt
          await tx.$executeRaw`
            UPDATE request_approvals
            SET "createdAt" = (NOW() AT TIME ZONE 'Asia/Manila'),
                "updatedAt" = (NOW() AT TIME ZONE 'Asia/Manila'),
                "sentOn"   = (NOW() AT TIME ZONE 'Asia/Manila')
            WHERE id = ${created.id}
          `;
          return created;
        })
      );

      // Log the action in request history
      await addHistory(tx as any, {
        requestId: requestId,
        action: 'Approvals Added',
        actorName: `${currentUser.emp_fname} ${currentUser.emp_lname}`,
        actorType: 'user',
        actorId: currentUser.id,
        details: `Added ${users.length} approver(s) to Level ${users[0].level}`,
      });

      return createdApprovals;
    });

    // Format the response
    const formattedApprovals = newApprovals.map(approval => ({
      id: approval.id.toString(),
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      approverId: approval.approverId,
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
  }
}
