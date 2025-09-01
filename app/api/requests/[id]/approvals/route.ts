import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addHistory } from '@/lib/history';
import { notifyNewApprover } from '@/lib/notifications';
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

    // Helper: format Date that's already in Philippine time (no timezone conversion needed)
    const formatStoredPhilippineTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      const second = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    // Format the approvals data
    const formattedApprovals = approvals.map((approval: any) => ({
      id: approval.id.toString(),
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      approverId: approval.approverId,
      approverName: approval.approver 
        ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}`
        : approval.approverEmail || 'Unknown Approver',
      approverEmail: approval.approver?.emp_email || approval.approverEmail || '',
      status: approval.status,
      sentOn: approval.sentOn ? formatStoredPhilippineTime(approval.sentOn) : null,
      actedOn: approval.actedOn ? formatStoredPhilippineTime(approval.actedOn) : null,
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
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const approvalData = users.map(user => ({
      requestId: requestId,
      approverId: user.userId,
      level: user.level,
      name: user.name,
      approverEmail: user.email,
      status: 'pending_approval' as const,
      createdAt: philippineTime,
    }));

    // Create the approvals in a transaction
    const newApprovals = await prisma.$transaction(async (tx: any) => {
      // Create Philippine time by manually adjusting UTC
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      // Create all approvals
      const createdApprovals = await Promise.all(
        approvalData.map(async (data) => {
          const created = await tx.requestApproval.create({
            data: {
              ...data,
              status: 'pending_approval',
              createdAt: philippineTime,
              updatedAt: philippineTime,
              sentOn: philippineTime,
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

    // 📧 Send notifications (email + in-app) to newly added approvers
    try {
      console.log(`📧 Sending notifications to ${newApprovals.length} newly added approver(s)...`);
      
      // Send notification to each newly added approver using the clean notification function
      const notificationPromises = newApprovals.map(async (approval: any) => {
        try {
          if (!approval.approverId) {
            console.warn(`Cannot send notification - no approver ID found for approval ${approval.id}`);
            return { success: false, email: 'unknown', error: 'No approver ID' };
          }

          // The notifyNewApprover function handles both email and in-app notifications
          const result = await notifyNewApprover(
            requestId,
            {
              id: approval.approverId,
              emp_email: approval.approver.emp_email,
              emp_fname: approval.approver.emp_fname,
              emp_lname: approval.approver.emp_lname,
            },
            approval.level
          );

          if (result) {
            console.log(`✅ Notification sent successfully to ${approval.approver.emp_fname} ${approval.approver.emp_lname} (${approval.approver.emp_email})`);
            return { success: true, email: approval.approver.emp_email };
          } else {
            console.error(`❌ Failed to send notification to ${approval.approver.emp_fname} ${approval.approver.emp_lname} (${approval.approver.emp_email})`);
            return { success: false, email: approval.approver.emp_email, error: 'Notification sending failed' };
          }

        } catch (error) {
          console.error(`❌ Error sending notification to approver ${approval.id}:`, error);
          return { 
            success: false, 
            email: approval.approver?.emp_email || 'unknown', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const notificationResults = await Promise.allSettled(notificationPromises);
      const successfulNotifications = notificationResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      console.log(`📊 Notification summary: ${successfulNotifications}/${newApprovals.length} notifications sent successfully`);

    } catch (notificationError) {
      console.error('❌ Error in notification process:', notificationError);
      // Don't fail the approval addition if notifications fail
    }

    // Format the response
    const formattedApprovals = newApprovals.map((approval: any) => ({
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
