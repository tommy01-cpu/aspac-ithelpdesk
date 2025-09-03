import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { RequestStatus } from '@prisma/client';
import { sendRequestClosedCCEmail, sendEmailWithTemplateId } from '@/lib/database-email-templates';
import { formatStatusForDisplay } from '@/lib/status-colors';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }

    const { status, notes, attachmentIds, sendEmail, emailTemplate, sendAppNotification } = await request.json();
    
    // Handle different status mappings
    let actualStatus = status;
    // No need to map anything - cancelled is already valid
    
    const allowed: Array<keyof typeof RequestStatus> = ['open', 'on_hold', 'for_approval', 'resolved', 'closed', 'cancelled'] as any;
    if (!actualStatus || !allowed.includes(actualStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const actor = await prisma.users.findFirst({ where: { emp_email: session.user.email } });
    if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const newStatus = (RequestStatus as any)[actualStatus] ?? actualStatus;

    // Update request status with Philippine time
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    // Prepare formData update
    const updatedFormData = {
      ...(existing.formData as any || {}),
      resolutionNotes: notes || null,
      resolutionAttachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
    };

    // Add closedDate if status is being changed to closed
    if (actualStatus === 'closed') {
      const closedDate = philippineTime.toISOString().slice(0, 19).replace('T', ' ');
      updatedFormData.closedDate = closedDate;
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        updatedAt: philippineTime,
        formData: updatedFormData
      }
    });

    // Create proper status display labels using the formatting function
    const oldStatusLabel = formatStatusForDisplay(existing.status.toString());
    const newStatusLabel = formatStatusForDisplay(status || actualStatus);

    // Add history entry with Philippine time (using new Prisma create method)
    await addHistory(prisma, {
      requestId,
      action: 'Status Change',
      actorId: actor.id,
      actorName: `${actor.emp_fname} ${actor.emp_lname}`,
      actorType: 'user',
      details: `Status changed from ${oldStatusLabel} to ${newStatusLabel}` + (notes ? `\nNotes : ${notes.replace(/<[^>]*>/g, '').trim()}` : ''),
    });

    // Send email notification if requested
    if (sendEmail && emailTemplate) {
      try {
        // Get the request with user data for email
        const requestWithUser = await prisma.request.findUnique({
          where: { id: requestId },
          include: {
            user: true
          }
        });

        if (requestWithUser) {
          // Get email recipients from formData['10'] (E-mail Id(s) To Notify)
          const formData = requestWithUser.formData as any;
          const emailNotifyField = formData?.['10'];
          let emailRecipients: string[] = [];

          if (Array.isArray(emailNotifyField)) {
            emailRecipients = emailNotifyField.filter(email => typeof email === 'string' && email.trim());
          } else if (typeof emailNotifyField === 'string' && emailNotifyField.trim()) {
            emailRecipients = [emailNotifyField.trim()];
          }

          // Only send CC emails if there are actual CC recipients specified
          // Don't automatically include the requester if no CC emails exist
          if (emailRecipients.length > 0) {
            // Include the requester in notifications only if CC emails exist
            if (requestWithUser.user.emp_email && !emailRecipients.includes(requestWithUser.user.emp_email)) {
              emailRecipients.push(requestWithUser.user.emp_email);
            }
          }

          // Send email notification only if there are CC recipients
          if (emailRecipients.length > 0) {
            // Prepare email variables
            const requesterName = `${requestWithUser.user.emp_fname} ${requestWithUser.user.emp_lname}`.trim();
            const requestSubject = formData?.['8'] || 'IT Helpdesk Request';
            const requestDescription = formData?.['9'] || 'No description provided';
            
            const emailVariables = {
              Request_ID: requestId.toString(),
              Request_Status: newStatusLabel,
              Request_Subject: requestSubject,
              Request_Description: requestDescription,
              Requester_Name: requesterName,
              Requester_Email: requestWithUser.user.emp_email || '',
              Request_Title: requestSubject,
              Emails_To_Notify: emailRecipients.join(', ')
            };

            // Handle different email templates
            if (emailTemplate === 'acknowledge-cc-closed') {
              // Send the closed CC email using the dedicated function
              const emailSent = await sendRequestClosedCCEmail(emailRecipients, emailVariables);
              
              if (!emailSent) {
                console.error('Failed to send closed CC email notification');
              }
            } else if (emailTemplate === '32') {
              // Send cancellation email using template 32
              const emailSent = await sendEmailWithTemplateId(
                parseInt(emailTemplate),
                emailVariables,
                emailRecipients[0] // Use first recipient as override (if any)
              );
              
              if (!emailSent) {
                console.error('Failed to send cancellation email notification');
              }
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send app notification if requested
    if (sendAppNotification) {
      try {
        // Get the request with user data for notification
        const requestWithUser = await prisma.request.findUnique({
          where: { id: requestId },
          include: {
            user: true
          }
        });

        if (requestWithUser) {
          const formData = requestWithUser.formData as any;
          const requestSubject = formData?.['8'] || 'IT Helpdesk Request';
          
          // Determine notification type based on status
          let notificationType: 'REQUEST_CLOSED' = 'REQUEST_CLOSED';
          
          // Create notification for the requester
          await createNotification({
            userId: requestWithUser.user.id,
            type: notificationType,
            title: `Request #${requestId} ${actualStatus === 'cancelled' ? 'Cancelled' : 'Status Changed'}`,
            message: `Your request "${requestSubject}" has been ${actualStatus === 'cancelled' ? 'cancelled' : `changed to ${newStatusLabel}`}.`,
            data: {
              requestId: requestId,
              oldStatus: existing.status,
              newStatus: actualStatus,
              requestSubject: requestSubject
            }
          });

          // Also notify people in the email notification list if available
          const emailNotifyField = formData?.['10'];
          let additionalEmails: string[] = [];

          if (Array.isArray(emailNotifyField)) {
            additionalEmails = emailNotifyField.filter(email => 
              typeof email === 'string' && 
              email.trim() && 
              email !== requestWithUser.user.emp_email
            );
          } else if (typeof emailNotifyField === 'string' && emailNotifyField.trim() && 
                     emailNotifyField !== requestWithUser.user.emp_email) {
            additionalEmails = [emailNotifyField.trim()];
          }

          // Create notifications for additional users
          for (const email of additionalEmails) {
            const user = await prisma.users.findFirst({
              where: { emp_email: email }
            });
            
            if (user) {
              await createNotification({
                userId: user.id,
                type: notificationType,
                title: `Request #${requestId} ${actualStatus === 'cancelled' ? 'Cancelled' : 'Status Changed'}`,
                message: `Request "${requestSubject}" by ${requestWithUser.user.emp_fname} ${requestWithUser.user.emp_lname} has been ${actualStatus === 'cancelled' ? 'cancelled' : `changed to ${newStatusLabel}`}.`,
                data: {
                  requestId: requestId,
                  oldStatus: existing.status,
                  newStatus: actualStatus,
                  requestSubject: requestSubject
                }
              });
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating app notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully',
      newStatus: actualStatus,
      request: updated 
    });
  } catch (e) {
    console.error('Status update error', e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}