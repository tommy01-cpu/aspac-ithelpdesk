import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmailWithTemplateId } from '@/lib/database-email-templates';
import { sendEmail } from '@/lib/database-email-templates';
import { createNotification } from '@/lib/notifications';

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

    // Get formData which may contain conversations
    const requestData = await prisma.request.findFirst({
      where: { id: requestId },
      select: {
        formData: true
      }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Extract conversations from formData
    const formData = requestData.formData as any;
    const conversations = formData?.conversations || [];

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching request conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
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
    const { message, attachments } = await request.json();

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

    // Get current request to get existing formData
    const currentRequest = await prisma.request.findFirst({
      where: { id: requestId },
      select: {
        formData: true,
        userId: true
      }
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Create new conversation entry
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      message: message.trim(),
      author: `${user.emp_fname} ${user.emp_lname}`,
      timestamp: new Date().toISOString(),
      authorId: user.id,
      attachments: attachments || [] // Store attachment information
    };

    // Get existing formData and add conversation to it
    const currentFormData = currentRequest.formData as any;
    const existingConversations = currentFormData?.conversations || [];
    const updatedConversations = [...existingConversations, newConversation];

    // Update formData with new conversation
    const updatedFormData = {
      ...currentFormData,
      conversations: updatedConversations
    };

    // Update the request with new conversation in formData
    await prisma.request.update({
      where: { id: requestId },
      data: {
        formData: updatedFormData,
        updatedAt: new Date()
      }
    });

    // Send email notification to approver if this request has pending clarifications
    try {
      // Check if this request has any approvals that are in for_clarification status
      const pendingClarificationApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: requestId,
          status: 'for_clarification'
        },
        include: {
          approver: {
            select: {
              emp_email: true,
              emp_fname: true,
              emp_lname: true
            }
          },
          request: {
            include: {
              user: {
                select: {
                  emp_fname: true,
                  emp_lname: true,
                  emp_email: true
                }
              }
            }
          }
        }
      });

      // Send email to each approver who has a pending clarification
      for (const approval of pendingClarificationApprovals) {
        if (approval.approver?.emp_email) {
          // Import the status formatting function
          const { formatStatusForDisplay } = await import('@/lib/status-colors');
          
          // Get proper request subject and description from form data
          const formData = approval.request.formData as any;
          const requestSubject = formData?.subject || formData?.title || formData?.['8'] || `Request #${approval.request.id}`;
          const requestDescription = formData?.description || formData?.details || formData?.['9'] || 'No description provided';
          
          // Template variables for clarification response to approver
          const templateVariables = {
            Approver_Name: `${approval.approver.emp_fname} ${approval.approver.emp_lname}`,
            Clarification: message.trim(),
            Request_ID: approval.request.id.toString(),
            Request_Status: formatStatusForDisplay(approval.request.status),
            Request_Subject: requestSubject,
            Request_Description: requestDescription,
            Request_Link: `${process.env.API_BASE_URL || process.env.NEXTAUTH_URL}/requests/view/${approval.request.id}`
          };

          // Use template 28 (clarification_response_to_approver)
          const emailContent = await sendEmailWithTemplateId(
            28, // clarification_response_to_approver template
            templateVariables,
            approval.approver.emp_email
          );
          
          if (emailContent) {
            await sendEmail({
              to: approval.approver.emp_email,
              subject: emailContent.subject,
              htmlMessage: emailContent.htmlContent,
              message: emailContent.textContent
            });
            
            console.log('✅ Requester response email sent to approver:', approval.approver.emp_email, 'using template: 28');

            if (approval.approverId) {
              // Create in-app notification for the approver
              await createNotification({
                userId: approval.approverId,
                type: 'CLARIFICATION_RESPONSE',
                title: 'Clarification Response Received',
                message: `The requester has responded to your clarification request for Request #${approval.request.id}`,
                data: {
                  requestId: approval.request.id,
                  approvalId: approval.id,
                  message: message.trim()
                }
              });
            }
          } else {
            console.error('❌ Failed to prepare email content from database template: 28');
          }
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send requester response email:', emailError);
      // Don't fail the conversation creation if email fails
    }

    return NextResponse.json({ 
      success: true,
      conversation: newConversation
    });
  } catch (error) {
    console.error('Error adding conversation:', error);
    return NextResponse.json(
      { error: 'Failed to add conversation' },
      { status: 500 }
    );
  }
}
