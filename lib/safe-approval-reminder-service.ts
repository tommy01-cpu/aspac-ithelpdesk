import { prisma } from './prisma';
import { sendEmailWithTemplateId, getTemplateIdByType, sendEmail } from './database-email-templates';

/**
 * Safe background service for approval reminders
 * Designed to NOT affect the main system even if it fails
 */
class SafeApprovalReminderService {
  private static instance: SafeApprovalReminderService;
  private isProcessing = false;
  private maxRetries = 3;
  private batchSize = 5; // Small batches to avoid memory issues

  private constructor() {}

  static getInstance(): SafeApprovalReminderService {
    if (!SafeApprovalReminderService.instance) {
      SafeApprovalReminderService.instance = new SafeApprovalReminderService();
    }
    return SafeApprovalReminderService.instance;
  }

  /**
   * SAFE email sending - wrapped in try-catch with isolation
   */
  async sendDailyReminders(): Promise<{ success: boolean; results?: any; error?: string }> {
    // Prevent multiple processes running
    if (this.isProcessing) {
      console.log('📧 Approval reminder already processing, skipping...');
      return { success: false, error: 'Already processing' };
    }

    try {
      this.isProcessing = true;
      console.log('📧 Starting SAFE approval reminder process...');

      // ISOLATED process - won't affect main system
      const result = await this.processRemindersIsolated();
      
      console.log('✅ Approval reminders completed safely');
      return { success: true, results: result };

    } catch (error) {
      // CRITICAL: Catch ALL errors to protect main system
      console.error('❌ Approval reminder failed safely (system protected):', error);
      
      // Log error but don't throw - protect main system
      await this.logErrorSafely(error);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Isolated process that won't crash main system - DIRECT DATABASE PROCESSING
   * No longer makes HTTP calls - processes locally like SLA monitoring
   */
  private async processRemindersIsolated(): Promise<any> {
    const startTime = new Date();
    const timestamp = startTime.toLocaleString('en-US', { 
      timeZone: 'Asia/Manila', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    });

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      console.log(`📧 [${timestamp}] Processing approval reminders LOCALLY (no HTTP calls)...`);
      
      // DIRECT DATABASE PROCESSING - like SLA monitoring service
      const result = await this.processApprovalRemindersDirectly();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const endTimestamp = endTime.toLocaleString('en-US', { 
        timeZone: 'Asia/Manila', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });

      console.log(`📧 [${endTimestamp}] Approval reminders completed in ${duration}ms`);
      console.log(`📧 [${endTimestamp}] Results:`, result);

      return result;

    } catch (error) {
      const errorTime = new Date();
      const errorDuration = errorTime.getTime() - startTime.getTime();
      const errorTimestamp = errorTime.toLocaleString('en-US', { 
        timeZone: 'Asia/Manila', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });

      console.error(`❌ [${errorTimestamp}] Error processing approval reminders after ${errorDuration}ms:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(errorMessage);
      return results;
    }
  }

  /**
   * Process approval reminders directly (like SLA monitoring) - NO HTTP CALLS
   * This is the core logic from the API endpoint, adapted for direct processing
   */
  private async processApprovalRemindersDirectly(): Promise<any> {
    try {
      console.log('🔔 Starting direct approval reminders process...');
      
      // Get all requests that are currently in approval status - with timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 15000)
      );

      const requestsForApproval = await Promise.race([
        prisma.request.findMany({
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
        }),
        timeoutPromise
      ]) as any[];

      console.log(`📋 Found ${requestsForApproval.length} requests in approval status`);

      // Filter to get only the current level pending approvals
      const currentLevelApprovals = [];
      
      for (const request of requestsForApproval) {
        // Find the current approval level (first pending approval in sequence)
        const currentApproval = request.approvals.find((approval: any) => 
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
        return {
          success: true,
          message: 'No pending approvals found',
          remindersSent: 0,
          totalPendingApprovals: 0
        };
      }

      // Group approvals by approver to avoid sending multiple emails to same person
      const approverGroups = new Map<number, typeof pendingApprovals>();
      
      pendingApprovals.forEach((approval: any) => {
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
      const results: any[] = [];

      // Send reminder email to each approver - in small batches
      const approverEntries = Array.from(approverGroups.entries());
      const batches = this.chunkArray(approverEntries, this.batchSize);

      for (const batch of batches) {
        await this.processApprovalBatch(batch, results);
        remindersSent += batch.filter(([_, approvals]) => 
          results.find(r => r.approverId === approvals[0].approverId && r.status === 'sent')
        ).length;
        
        // Delay between batches to avoid overwhelming email service
        await this.delay(2000); // 2 second delay
      }

      console.log(`🎯 Approval reminders process completed: ${remindersSent}/${approverGroups.size} sent successfully`);

      return {
        success: true,
        message: `Daily approval reminders sent`,
        remindersSent,
        totalApprovers: approverGroups.size,
        totalPendingApprovals: pendingApprovals.length,
        results
      };

    } catch (error) {
      console.error('❌ Error in direct approval reminders:', error);
      throw new Error(`Direct approval reminders failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process a batch of approvers safely
   */
  private async processApprovalBatch(batch: Array<[number, any[]]>, results: any[]): Promise<void> {
    for (const [approverId, approvals] of batch) {
      try {
        const approver = approvals[0].approver; // Get approver details from first approval
        
        if (!approver || !approver.emp_email) {
          console.log(`⚠️ Skipping approver ${approverId} - no email found`);
          continue;
        }

        console.log(`📧 Sending reminder to ${approver.emp_fname} ${approver.emp_lname} (${approver.emp_email})`);
        console.log(`📋 Pending requests: ${approvals.map((a: any) => `#${a.requestId}`).join(', ')}`);

        // Send the reminder email
        const emailResult = await this.sendApprovalReminderEmailSafely(approver, approvals);
        
        if (emailResult) {
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
  }

  /**
   * Send approval reminder email safely with timeout protection
   */
  private async sendApprovalReminderEmailSafely(approver: any, approvals: any[]): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 30000)
      );

      const emailPromise = this.sendApprovalReminderEmail(approver, approvals);

      return await Promise.race([emailPromise, timeoutPromise]);
    } catch (error) {
      console.error(`❌ Email send failed for ${approver.emp_email}:`, error);
      return false;
    }
  }

  /**
   * Send approval reminder email (adapted from API endpoint)
   */
  private async sendApprovalReminderEmail(approver: any, approvals: any[]): Promise<boolean> {
    try {
      // Prepare email variables with specific request links
      const requestsList = approvals.map((approval: any) => {
        const request = approval.request;
        const requesterName = `${request.user.emp_fname} ${request.user.emp_lname}`.trim();
        const requestSubject = this.getRequestSubject(request.formData);
        const baseUrl = process.env.NEXTAUTH_URL || 'https:/ithelpdesk.aspacphils.com.ph';
        const specificRequestApprovalUrl = `${baseUrl}/requests/approvals/${request.id}`;
        const specificRequestViewUrl = `${baseUrl}/requests/view/${request.id}`;
        return `- Request #${request.id}: "${requestSubject}" from ${requesterName} - [View Request](${specificRequestViewUrl}) | [Approve Here](${specificRequestApprovalUrl})`;
      }).join('\n');

      const baseUrl = process.env.NEXTAUTH_URL || 'https:/ithelpdesk.aspacphils.com.ph';
      const primaryRequestId = approvals[0].requestId;
      const requestViewUrl = `${baseUrl}/requests/view/${primaryRequestId}`;
      const specificApprovalUrl = `${baseUrl}/requests/approvals/${primaryRequestId}`;

      const emailVariables = {
        Approver_Name: `${approver.emp_fname} ${approver.emp_lname}`.trim(),
        Approver_Email: approver.emp_email,
        Pending_Requests_Count: approvals.length.toString(),
        Pending_Requests_List: requestsList,
        Base_URL: baseUrl,
        approval_link: specificApprovalUrl,
        request_link: requestViewUrl,
        Encoded_Approvals_URL: encodeURIComponent(specificApprovalUrl)
      };

      // Try to get database template first
      const templateId = await getTemplateIdByType('APPROVAL_REMINDER');
      
      if (templateId) {
        console.log(`📧 Using database template ID ${templateId} for approval reminder`);
        const emailContent = await sendEmailWithTemplateId(templateId, emailVariables);
        
        if (emailContent) {
          return await sendEmail({
            to: [approver.emp_email],
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
        <p>Dear ${emailVariables.Approver_Name},</p>
        
        <p>This is a daily reminder that you have <strong>${emailVariables.Pending_Requests_Count}</strong> pending approval(s) in the IT Helpdesk system:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
          <pre>${emailVariables.Pending_Requests_List}</pre>
        </div>
        
        <p>Please review and take action on these requests to avoid delays in processing.</p>
        
        <p><a href="${emailVariables.approval_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Pending Approvals</a></p>
        
        <p>This mailbox is not monitored. Please do not reply to this message.</p>
        <p>Keep Calm & Use the IT Help Desk!</p>
      `;

      return await sendEmail({
        to: [approver.emp_email],
        subject: fallbackSubject,
        htmlMessage: fallbackContent,
        variables: {}
      });

    } catch (error) {
      console.error('Error sending approval reminder email:', error);
      return false;
    }
  }

  /**
   * Extract request subject from formData (helper function)
   */
  private getRequestSubject(formData: any): string {
    if (typeof formData === 'object' && formData !== null) {
      return formData['8'] || formData['name'] || formData['title'] || formData['subject'] || 'Untitled Request';
    }
    return 'Untitled Request';
  }

  /**
   * Utility functions
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe error logging that won't crash system
   */
  private async logErrorSafely(error: any): Promise<void> {
    try {
      // Log to file or external service
      console.error('🚨 APPROVAL REMINDER ERROR:', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Could also log to external service like Sentry
      // await sentry.captureException(error);

    } catch (logError) {
      // Even logging failed - but don't crash main system
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Health check - can be called to verify service status
   */
  getStatus(): { isProcessing: boolean; lastRun?: string } {
    return {
      isProcessing: this.isProcessing,
      lastRun: new Date().toISOString()
    };
  }

  /**
   * Manual trigger for testing approval reminders
   */
  async manualTriggerReminders(): Promise<any> {
    try {
      if (!this || typeof this.sendDailyReminders !== 'function') {
        throw new Error('Approval reminder service not properly initialized');
      }
      return await this.sendDailyReminders();
    } catch (error) {
      console.error('Manual approval reminders trigger failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Manual trigger failed' 
      };
    }
  }
}

export const safeApprovalReminderService = SafeApprovalReminderService.getInstance();
