import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ApprovalStatus, RequestStatus } from '@prisma/client';
import { getDatabaseTimestamp } from '@/lib/server-time-utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approvalId, action, comments } = await request.json();

    if (!approvalId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the user from the database
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the approval
    const approval = await prisma.requestApproval.findUnique({
      where: { id: parseInt(approvalId) },
      include: {
        request: true
      }
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Check if user is authorized to act on this approval (either by ID or email)
    if (approval.approverId !== user.id && approval.approverEmail !== user.emp_email) {
      return NextResponse.json({ error: 'Not authorized to act on this approval' }, { status: 403 });
    }

    // Map action to approval status using the defined constants
    let newApprovalStatus: ApprovalStatus;
    let historyAction: string;
    let historyDetails: string;

    switch (action) {
      case 'approve':
        newApprovalStatus = ApprovalStatus.approved;
        historyAction = 'Approved';
        historyDetails = comments ? `Request approved by ${user.emp_fname} ${user.emp_lname}. Comments: ${comments}` : `Request approved by ${user.emp_fname} ${user.emp_lname}`;
        break;
      case 'reject':
        newApprovalStatus = ApprovalStatus.rejected;
        historyAction = 'Rejected';
        historyDetails = comments ? `Request rejected by ${user.emp_fname} ${user.emp_lname}. Comments: ${comments}` : `Request rejected by ${user.emp_fname} ${user.emp_lname}`;
        break;
      case 'clarification':
        newApprovalStatus = ApprovalStatus.for_clarification;
        historyAction = 'Requested Clarification';
        historyDetails = comments ? `Clarification requested by ${user.emp_fname} ${user.emp_lname}. Message: ${comments}` : `Clarification requested by ${user.emp_fname} ${user.emp_lname}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the approval with new status
    const updatedApproval = await prisma.requestApproval.update({
      where: { id: parseInt(approvalId) },
      data: {
        status: newApprovalStatus,
        actedOn: new Date(),
        comments: comments || null
      }
    });

    // Add to request history
    await prisma.requestHistory.create({
      data: {
        requestId: approval.requestId,
        action: historyAction,
        actorName: `${user.emp_fname} ${user.emp_lname}`,
        actorType: 'approver',
        details: historyDetails,
        actorId: user.id,
        timestamp: new Date()
      }
    });

    // Handle business logic based on approval action
    if (action === 'reject') {
      // If any approval is rejected, automatically close the request
      await prisma.request.update({
        where: { id: approval.requestId },
        data: { status: RequestStatus.closed }
      });

      await prisma.requestHistory.create({
        data: {
          requestId: approval.requestId,
          action: 'Request Closed',
          actorName: 'System',
          actorType: 'system',
          details: 'Request automatically closed due to approval rejection',
          timestamp: new Date()
        }
      });

    } else if (action === 'approve') {
      // Check if all approvals in this level are complete
      const levelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: approval.level
        }
      });

      const allLevelApproved = levelApprovals.every(app => 
        app.id === parseInt(approvalId) ? true : app.status === ApprovalStatus.approved
      );
      
      if (allLevelApproved) {
        // Check if there are more levels
        const nextLevelApprovals = await prisma.requestApproval.findMany({
          where: {
            requestId: approval.requestId,
            level: approval.level + 1
          }
        });

        if (nextLevelApprovals.length > 0) {
          // Update next level approvals to pending_approval
          await prisma.requestApproval.updateMany({
            where: {
              requestId: approval.requestId,
              level: approval.level + 1
            },
            data: {
              status: ApprovalStatus.pending_approval,
              sentOn: new Date()
            }
          });

          // Add history for next level activation
          await prisma.requestHistory.create({
            data: {
              requestId: approval.requestId,
              action: 'Next Level Activated',
              actorName: 'System',
              actorType: 'system',
              details: `Level ${approval.level + 1} approvals activated`,
              timestamp: new Date()
            }
          });
        } else {
          // All approval levels complete, check if ALL approvals across all levels are approved
          const allRequestApprovals = await prisma.requestApproval.findMany({
            where: { requestId: approval.requestId }
          });

          const allApproved = allRequestApprovals.every(app => 
            app.id === parseInt(approvalId) ? true : app.status === ApprovalStatus.approved
          );

          if (allApproved) {
            // All approvals complete, update request status to OPEN (ready for work)
            await prisma.request.update({
              where: { id: approval.requestId },
              data: { status: RequestStatus.open }
            });

            await prisma.requestHistory.create({
              data: {
                requestId: approval.requestId,
                action: 'Request Approved - Ready for Work',
                actorName: 'System',
                actorType: 'system',
                details: 'All approvals completed successfully, request is now open for work',
                timestamp: new Date()
              }
            });
          }
        }
      }
    } else if (action === 'clarification') {
      // For clarification, we only update the approval status
      // The request status remains unchanged
      
      // Create a conversation entry for clarification
      if (comments && comments.trim()) {
        try {
          // Try to create an approval conversation entry
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await prisma.$executeRaw`
            INSERT INTO approval_conversations (id, "approvalId", "authorId", type, message, "isRead", "readBy", "createdAt", "updatedAt")
            VALUES (${conversationId}, ${parseInt(approvalId)}, ${user.id}, 'technician', ${comments.trim()}, false, ${JSON.stringify([user.id])}::jsonb, ${new Date()}, ${new Date()})
          `;
        } catch (error) {
          console.log('ApprovalConversation table not available, using history instead');
          // Fallback to history if conversation table doesn't exist
          await prisma.requestHistory.create({
            data: {
              requestId: approval.requestId,
              action: 'Conversation',
              actorName: `${user.emp_fname} ${user.emp_lname}`,
              actorType: 'approver',
              details: `Clarification message: ${comments}`,
              actorId: user.id,
              timestamp: new Date()
            }
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Request ${action}d successfully`,
      approval: updatedApproval 
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      { error: 'Failed to process approval action' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
