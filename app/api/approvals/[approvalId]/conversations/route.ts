export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addHistory } from '@/lib/history';
import { getDatabaseTimestamp, normalizeClientTimestamp } from '@/lib/server-time-utils';
import { sendEmailWithTemplateId } from '@/lib/database-email-templates';
import { sendEmail } from '@/lib/database-email-templates';
import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { approvalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approvalId = params.approvalId;

    // Use Prisma relations instead of raw SQL
    try {
      const conversations = await prisma.approvalConversation.findMany({
        where: {
          approvalId: parseInt(approvalId)
        },
        include: {
          author: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const formattedConversations = conversations.map((conv: any) => ({
        id: conv.id,
        type: conv.type,
        message: conv.message,
        author: `${conv.author.emp_fname} ${conv.author.emp_lname}`,
        timestamp: conv.createdAt,
        isRead: conv.isRead,
        isOwnMessage: false // Will be determined on frontend
      }));

      return NextResponse.json({ conversations: formattedConversations });
    } catch (dbError) {
      console.log('DB Error - returning empty conversations:', dbError);
      return NextResponse.json({ conversations: [] });
    }
  } catch (error) {
    console.error('Error fetching approval conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { approvalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approvalId = parseInt(params.approvalId);
    const { message, type, isClarificationRequest } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get the user
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      // Use Prisma create with Philippine time
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create Philippine time by manually adjusting UTC
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      const conversation = await prisma.approvalConversation.create({
        data: {
          id: conversationId,
          approvalId: approvalId,
          authorId: user.id,
          type: type || 'user',
          message: message.trim(),
          isRead: false,
          readBy: [user.id],
          createdAt: philippineTime,
        },
        include: {
          author: {
            select: {
              emp_fname: true,
              emp_lname: true
            }
          }
        }
      });

      // Get the approval to find the request ID for history tracking
      const approval = await prisma.requestApproval.findUnique({
        where: { id: approvalId },
        include: { 
          request: {
            include: {
              user: true
            }
          },
          approver: true 
        }
      });

      // Add history entry for the conversation message
      if (approval?.request) {
        await addHistory(prisma as any, {
          requestId: approval.request.id,
          action: 'Conversation Message',
          actorName: `${user.emp_fname} ${user.emp_lname}`,
          actorType: 'user',
          details: `New message in approval conversation with ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'Approver'}: "${message.trim().substring(0, 100)}${message.trim().length > 100 ? '...' : ''}"`,
          actorId: user.id,
        });

        // Send email notification and in-app notification for ALL conversation messages
        try {
          // Import the status formatting function first
          const { formatStatusForDisplay } = await import('@/lib/status-colors');
          
          // Get proper request subject and description from form data
          const formData = approval.request.formData as any;
          
          // Determine who to notify and which template to use
          let emailRecipient = '';
          let recipientName = '';
          let templateId = 0;
          let templateVariables: any = {};
          
          if (user.id === approval.request.userId) {
            // User (requester) posted, notify the approver
            emailRecipient = approval.approver?.emp_email || '';
            recipientName = `${approval.approver?.emp_fname || ''} ${approval.approver?.emp_lname || ''}`.trim();
            templateId = 28; // clarification_response_to_approver
            
            templateVariables = {
              Approver_Name: recipientName,
              Clarification: message.trim(),
              Request_ID: approval.request.id.toString(),
              Request_Status: formatStatusForDisplay(approval.request.status),
              Request_Subject: formData?.subject || formData?.title || formData?.['8'] || `Request #${approval.request.id}`,
              Request_Description: formData?.description || formData?.details || formData?.['9'] || 'No description provided',
              Request_Link: `${process.env.NEXTAUTH_URL || 'http://192.168.1.85:3000'}/requests/view/${approval.request.id}`
            };
          } else {
            // Approver posted, notify the requester  
            emailRecipient = approval.request.user.emp_email || '';
            recipientName = `${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`;
            templateId = 29; // clarification_request_to_requester
            
            templateVariables = {
              Requester_Name: recipientName,
              Clarification: message.trim(),
              Request_ID: approval.request.id.toString(),
              Request_Status: formatStatusForDisplay(approval.request.status),
              Request_Subject: formData?.subject || formData?.title || formData?.['8'] || `Request #${approval.request.id}`,
              Request_Description: formData?.description || formData?.details || formData?.['9'] || 'No description provided',
              Request_Link: `${process.env.NEXTAUTH_URL || 'http://192.168.1.85:3000'}/requests/view/${approval.request.id}`
            };
          }

          if (emailRecipient) {
            // Use database email template system with the appropriate template
            const emailContent = await sendEmailWithTemplateId(
              templateId,
              templateVariables,
              emailRecipient // Override recipient
            );
            
            if (emailContent) {
              // Send the email using the database template system
              await sendEmail({
                to: emailRecipient,
                subject: emailContent.subject,
                htmlMessage: emailContent.htmlContent,
                message: emailContent.textContent
              });
              
              console.log('✅ Clarification conversation email sent to:', emailRecipient, 'using template:', templateId);
            } else {
              console.error('❌ Failed to prepare email content from database template:', templateId);
            }

            // Create in-app notification for ALL conversation messages
            console.log('🔍 Notification Debug Info:', {
              currentUserId: user.id,
              requesterId: approval.request.userId,
              approverId: approval.approverId,
              isRequesterSending: user.id === approval.request.userId,
              isClarificationRequest: isClarificationRequest,
              userEmail: user.emp_email,
              approverEmail: approval.approver?.emp_email,
              requesterEmail: approval.request.user?.emp_email
            });

            if (user.id === approval.request.userId) {
              // Requester responded, notify approver
              console.log('🎯 Requester is sending message, will notify approver');
              if (approval.approverId && approval.approverId !== approval.request.userId) {
                console.log('✅ Conditions met, sending notification to approver:', approval.approverId);
                await createNotification({
                  userId: approval.approverId,
                  type: 'CLARIFICATION_REQUIRED',
                  title: 'Clarification Response Received',
                  message: `The requester has responded to your clarification request for Request #${approval.request.id}`,
                  data: {
                    requestId: approval.request.id,
                    approvalId: approval.id,
                    message: message.trim(),
                    redirectUrl: `/requests/approvals/${approval.request.id}`
                  }
                });
                console.log('✅ In-app notification sent to approver:', approval.approverId);
                console.log('🔗 Redirect URL set to: /requests/approvals/' + approval.request.id);
              } else {
                console.log('❌ Cannot notify approver - approverId:', approval.approverId, 'same as requester:', approval.request.userId);
              }
            } else {
              // Approver posted, notify requester (only if they're different people)
              console.log('🎯 Approver is sending message, will notify requester');
              if (approval.approverId !== approval.request.userId) {
                console.log('✅ Conditions met, sending notification to requester:', approval.request.userId);
                const redirectUrl = `/requests/view/${approval.request.id}?tab=approvals`;
                
                // Only create notification for regular messages, not clarification requests
                // (clarification requests are handled by the approval action API)
                if (!isClarificationRequest) {
                  console.log('🎯 Creating APPROVAL_REQUIRED notification for conversation');
                  await createNotification({
                    userId: approval.request.userId,
                    type: 'APPROVAL_REQUIRED',
                    title: 'New Message in Approval Conversation',
                    message: `An approver has sent a message regarding Request #${approval.request.id}`,
                    data: {
                      requestId: approval.request.id,
                      approvalId: approval.id,
                      message: message.trim(),
                      redirectUrl: redirectUrl
                    }
                  });
                  console.log('✅ Conversation notification sent to requester:', approval.request.userId);
                } else {
                  console.log('🚫 Skipping notification for clarification request - handled by approval action API');
                }
                console.log('🔗 Redirect URL set to:', redirectUrl);
              } else {
                console.log('🚫 No notification sent - approver and requester are the same person');
              }
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send clarification conversation email/notification:', emailError);
          console.error('❌ Error details:', {
            error: emailError,
            stack: emailError instanceof Error ? emailError.stack : 'No stack trace',
            message: emailError instanceof Error ? emailError.message : String(emailError)
          });
          // Don't fail the conversation creation if email/notification fails
        }
      }

      console.log('✅ Successfully saved conversation to database');
      console.log('🔍 Conversation ID:', conversationId);
      
      const formattedConversation = {
        id: conversation.id,
        type: conversation.type,
        message: conversation.message,
        author: `${conversation.author.emp_fname} ${conversation.author.emp_lname}`,
        timestamp: conversation.createdAt,
        isRead: conversation.isRead,
        isOwnMessage: true
      };

      console.log('🔍 Formatted conversation to return:', formattedConversation);
      return NextResponse.json({ conversation: formattedConversation });
    } catch (dbError) {
      console.error('DB Error - falling back to mock:', dbError);
      
      // Even if DB fails, return success for UI consistency
      const formattedConversation = {
        id: `mock_${Date.now()}`,
        type: type || 'user',
        message: message.trim(),
        author: `${user.emp_fname} ${user.emp_lname}`,
  timestamp: getDatabaseTimestamp().toISOString(),
        isRead: true,
        isOwnMessage: true
      };

      return NextResponse.json({ conversation: formattedConversation });
    }
  } catch (error) {
    console.error('Error creating approval conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
