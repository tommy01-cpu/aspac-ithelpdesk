export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmailWithTemplateId, getTemplateIdByType } from '@/lib/database-email-templates';
import { sendEmail } from '@/lib/database-email-templates';

// This endpoint sends daily reminder emails to approvers with pending approvals
// Should be called by an external scheduler (e.g., Windows Task Scheduler, cron job, etc.) at 8 AM daily
export async function POST() {
  try {
    console.log('🔔 Starting daily approval reminders process...');
    
    // Get all requests that are currently in approval status
    const requestsForApproval = await prisma.request.findMany({
      where: {
        status: 'for_approval'
      },
      include: {
        approvals: {
          include: {
            approver: true
          },
          orderBy: {
            level: 'asc'
          }
        },
        user: true
      }
    });

    console.log(`📋 Found ${requestsForApproval.length} requests in approval status`);

    // Filter to get only the current level pending approvals
    const currentLevelApprovals = [];
    
    for (const request of requestsForApproval) {
      // Find the current approval level (first pending approval in sequence)
      const currentApproval = request.approvals.find(approval => 
        approval.status === 'pending_approval'
      );
      
      if (currentApproval && currentApproval.approver) {
        currentLevelApprovals.push({
          ...currentApproval,
          request: {
            ...request,
            approvals: undefined // Remove nested approvals to avoid circular reference
          }
        });
      }
    }

    const pendingApprovals = currentLevelApprovals;

    console.log(`📊 Found ${pendingApprovals.length} pending approvals to process`);

    if (pendingApprovals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending approvals found',
        remindersSent: 0
      });
    }

    // Group approvals by approver to avoid sending multiple emails to same person
    const approverGroups = new Map<number, typeof pendingApprovals>();
    
    pendingApprovals.forEach(approval => {
      const approverId = approval.approverId;
      if (approverId && !approverGroups.has(approverId)) {
        approverGroups.set(approverId, []);
      }
      if (approverId) {
        approverGroups.get(approverId)!.push(approval);
      }
    });

    console.log(`👥 Sending reminders to ${approverGroups.size} unique approvers`);

    let remindersSent = 0;
    const results = [];

    // Send reminder email to each approver
    for (const [approverId, approvals] of Array.from(approverGroups.entries())) {
      try {
        const approver = approvals[0].approver; // Get approver details from first approval
        
        if (!approver || !approver.emp_email) {
          console.log(`⚠️ Skipping approver ${approverId} - no email found`);
          continue;
        }

        console.log(`📧 Sending reminder to ${approver.emp_fname} ${approver.emp_lname} (${approver.emp_email})`);
        console.log(`📋 Pending requests: ${approvals.map((a: any) => `#${a.requestId}`).join(', ')}`);

        // Prepare email variables with specific request links
        const requestsList = approvals.map((approval: any) => {
          const request = approval.request;
          const requesterName = `${request.user.emp_fname} ${request.user.emp_lname}`.trim();
          const requestSubject = getRequestSubject(request.formData);
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const specificRequestApprovalUrl = `${baseUrl}${process.env.APPROVAL_URL || '/requests/approvals'}/${request.id}`;
          const specificRequestViewUrl = `${baseUrl}${process.env.REQUEST_VIEW_URL || '/requests/view'}/${request.id}`;
          return `- Request #${request.id}: "${requestSubject}" from ${requesterName} - [View Request](${specificRequestViewUrl}) | [Approve Here](${specificRequestApprovalUrl})`;
        }).join('\n');

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const approvalBasePath = process.env.APPROVAL_URL || '/requests/approvals';
        const requestViewBasePath = process.env.REQUEST_VIEW_URL || '/requests/view';
        
        // Construct full URLs using base URL
        const primaryRequestId = approvals[0].requestId;
        const requestViewUrl = `${baseUrl}${requestViewBasePath}/${primaryRequestId}`;
        
        // Always use specific approval URL for the first/primary request
        // This will be the main action button in the email
        const specificApprovalUrl = `${baseUrl}${approvalBasePath}/${primaryRequestId}`;

        const emailVariables = {
          Approver_Name: `${approver.emp_fname} ${approver.emp_lname}`.trim(),
          Approver_Email: approver.emp_email,
          Pending_Requests_Count: approvals.length.toString(),
          Pending_Requests_List: requestsList,
          Base_URL: baseUrl,
          approval_link: specificApprovalUrl, // Specific request approval
          request_link: requestViewUrl, // Specific request view (not general page)
          Encoded_Approvals_URL: encodeURIComponent(specificApprovalUrl)
        };

        // Send reminder email using database template
        const result = await sendApprovalReminderEmail(approver.emp_email, emailVariables);
        
        if (result) {
          remindersSent++;
          results.push({
            approverId,
            approverEmail: approver.emp_email,
            approverName: `${approver.emp_fname} ${approver.emp_lname}`.trim(),
            pendingCount: approvals.length,
            status: 'sent'
          });
          console.log(`✅ Reminder sent successfully to ${approver.emp_email}`);
        } else {
          results.push({
            approverId,
            approverEmail: approver.emp_email,
            approverName: `${approver.emp_fname} ${approver.emp_lname}`.trim(),
            pendingCount: approvals.length,
            status: 'failed'
          });
          console.log(`❌ Failed to send reminder to ${approver.emp_email}`);
        }

      } catch (error) {
        console.error(`❌ Error sending reminder to approver ${approverId}:`, error);
        results.push({
          approverId,
          approverEmail: 'unknown',
          approverName: 'unknown',
          pendingCount: approvals.length,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🎯 Approval reminders process completed: ${remindersSent}/${approverGroups.size} sent successfully`);

    return NextResponse.json({
      success: true,
      message: `Daily approval reminders sent`,
      remindersSent,
      totalApprovers: approverGroups.size,
      totalPendingApprovals: pendingApprovals.length,
      results
    });

  } catch (error) {
    console.error('❌ Error in daily approval reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send daily approval reminders', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to extract request subject from formData
function getRequestSubject(formData: any): string {
  if (typeof formData === 'object' && formData !== null) {
    // Try common field IDs for request subject/title
    return formData['8'] || formData['name'] || formData['title'] || formData['subject'] || 'Untitled Request';
  }
  return 'Untitled Request';
}

// Helper function to send approval reminder email
async function sendApprovalReminderEmail(approverEmail: string, variables: Record<string, string>): Promise<boolean> {
  try {
    // Get the template ID for approval reminder notification
    const templateId = await getTemplateIdByType('APPROVAL_REMINDER');
    
    if (templateId) {
      // Use database template
      console.log(`📧 Using database template ID ${templateId} for approval reminder`);
      const emailContent = await sendEmailWithTemplateId(templateId, variables);
      
      if (emailContent) {
        return await sendEmail({
          to: [approverEmail],
          subject: emailContent.subject,
          htmlMessage: emailContent.htmlContent,
          variables: {}
        });
      }
    }

    // Fallback to hardcoded template if database template not found
    console.log('⚠️ Database template not found, using fallback template');
    const fallbackSubject = 'IT HELPDESK: Daily Approval Reminder';
    const fallbackContent = `
      <p>Dear ${variables.Approver_Name},</p>
      
      <p>This is a daily reminder that you have <strong>${variables.Pending_Requests_Count}</strong> pending approval(s) in the IT Helpdesk system:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
        <pre>${variables.Pending_Requests_List}</pre>
      </div>
      
      <p>Please review and take action on these requests to avoid delays in processing.</p>
      
      <p><a href="${variables.approval_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Pending Approvals</a></p>
      
      <p>This mailbox is not monitored. Please do not reply to this message.</p>
      <p>Keep Calm & Use the IT Help Desk!</p>
    `;

    return await sendEmail({
      to: [approverEmail],
      subject: fallbackSubject,
      htmlMessage: fallbackContent,
      variables: {}
    });

  } catch (error) {
    console.error('Error sending approval reminder email:', error);
    return false;
  }
}
