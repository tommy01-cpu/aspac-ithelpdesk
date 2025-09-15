import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { RequestStatus } from '@prisma/client';
import { sendRequestClosedCCEmail, sendRequestCancelledCCEmail, sendEmailWithTemplateId, sendEmail } from '@/lib/database-email-templates';
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

    const { status, notes, attachmentIds, sendEmail: shouldSendEmail, emailTemplate, sendAppNotification, excludeTechnician } = await request.json();
    
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
    if (shouldSendEmail && emailTemplate) {
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
          let ccEmailRecipients: string[] = [];

          if (Array.isArray(emailNotifyField)) {
            ccEmailRecipients = emailNotifyField.filter(email => typeof email === 'string' && email.trim());
          } else if (typeof emailNotifyField === 'string' && emailNotifyField.trim()) {
            ccEmailRecipients = [emailNotifyField.trim()];
          }

          // Always send emails for cancellation (at minimum to requester)
          if (true) {
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
              Emails_To_Notify: ccEmailRecipients.join(', '),
              Request_URL: `${process.env.API_BASE_URL || process.env.NEXTAUTH_URL}/requests/view/${requestId}`,
              Request_Link: `${process.env.API_BASE_URL || process.env.NEXTAUTH_URL}/requests/view/${requestId}`,
              // For reopened requests, use N/A for approval-related fields
              Request_Approval_Status: 'N/A (Status Change)',
              Request_Approval_Comment: 'Request has been reopened for further work'
            };

            // Handle different email templates
            if (emailTemplate === 'acknowledge-cc-closed') {
              // Send the closed CC email using the dedicated function
              const emailSent = await sendRequestClosedCCEmail(ccEmailRecipients, emailVariables);
              
              if (!emailSent) {
                console.error('Failed to send closed CC email notification');
              }
            } else if (emailTemplate === 'email-user-cancelled') {
              // Send cancellation email using template 32 (requester notification)
              console.log('📧 Processing cancellation emails - Template 32 for requester');
              const emailContent32 = await sendEmailWithTemplateId(
                32, // Template ID for email-user-cancelled
                emailVariables,
                requestWithUser.user.emp_email || undefined // Send to requester directly
              );
              
              if (emailContent32) {
                // Actually send the email to requester
                const emailSent = await sendEmail({
                  to: requestWithUser.user.emp_email || '',
                  cc: emailContent32.cc,
                  subject: emailContent32.subject,
                  message: emailContent32.textContent,
                  htmlMessage: emailContent32.htmlContent,
                });
                
                if (!emailSent) {
                  console.error('Failed to send cancellation email notification using template 32');
                } else {
                  console.log('✅ Successfully sent cancellation email to requester using template 32');
                }
              } else {
                console.error('Failed to prepare cancellation email content from template 32');
              }

              // Send CC email using template 29 for cancelled requests (only if there are actual CC recipients)
              if (actualStatus === 'cancelled') {
                console.log('📧 Processing cancellation emails - Template 29 for CC recipients');
                
                // Get only the CC recipients (exclude the requester)
                const ccOnlyRecipients = ccEmailRecipients.filter((email: string) => 
                  email !== requestWithUser.user.emp_email
                );
                
                if (ccOnlyRecipients.length > 0) {
                  console.log('Found CC recipients for template 29:', ccOnlyRecipients);
                  try {
                    // Use the dedicated function for cancellation CC emails
                    const ccEmailSent = await sendRequestCancelledCCEmail(ccOnlyRecipients, emailVariables);
                    
                    if (!ccEmailSent) {
                      console.error('Failed to send cancellation CC email notification using template 29');
                    } else {
                      console.log('✅ Successfully sent cancellation CC email using template 29 to:', ccOnlyRecipients);
                    }
                  } catch (ccEmailError) {
                    console.error('Error sending cancellation CC email using template 29:', ccEmailError);
                  }
                } else {
                  console.log('ℹ️  No CC recipients found for template 29 cancellation email (only requester in notification list)');
                }
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

          // If excludeTechnician is true, filter out the assigned technician email
          if (excludeTechnician) {
            const assignedTechnicianEmail = formData?.assignedTechnicianEmail;
            if (assignedTechnicianEmail) {
              additionalEmails = additionalEmails.filter(email => email !== assignedTechnicianEmail);
              console.log('🚫 Excluded technician email from app notifications:', assignedTechnicianEmail);
            }
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