import { prisma } from './prisma';

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
   * Isolated process that won't crash main system
   */
  private async processRemindersIsolated(): Promise<any> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get pending approvals with timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 10000)
      );

      const approvals = await Promise.race([
        this.getPendingApprovals(),
        timeoutPromise
      ]) as any[];

      if (!approvals || approvals.length === 0) {
        console.log('📭 No pending approvals found');
        return results;
      }

      console.log(`📧 Found ${approvals.length} pending approvals`);

      // Process in small batches to avoid memory issues
      const batches = this.chunkArray(approvals, this.batchSize);

      for (const batch of batches) {
        await this.processBatchSafely(batch, results);
        
        // Small delay between batches to avoid overwhelming system
        await this.delay(500);
      }

      return results;

    } catch (error) {
      console.error('❌ Error in isolated process:', error);
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return results;
    }
  }

  /**
   * Process batch safely - each email isolated
   */
  private async processBatchSafely(batch: any[], results: any): Promise<void> {
    for (const approval of batch) {
      try {
        results.processed++;

        // Each email send is isolated with timeout
        await this.sendSingleEmailSafely(approval);
        
        results.successful++;
        console.log(`✅ Sent reminder to ${approval.email}`);

      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to send to ${approval.email}: ${error instanceof Error ? error.message : 'Unknown'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        
        // Continue processing other emails - don't stop on single failure
      }
    }
  }

  /**
   * Send single email with timeout protection
   */
  private async sendSingleEmailSafely(approval: any): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email timeout')), 30000) // 30 second timeout
    );

    const emailPromise = this.callEmailAPI(approval);

    await Promise.race([emailPromise, timeoutPromise]);
  }

  /**
   * Call email API safely
   */
  private async callEmailAPI(approval: any): Promise<void> {
    try {
      const response = await fetch('/api/approvals/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approvalId: approval.id,
          email: approval.email 
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

    } catch (error) {
      throw new Error(`Email API failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Get pending approvals with safe query
   */
  private async getPendingApprovals(): Promise<any[]> {
    try {
      const approvals = await prisma.requestApproval.findMany({
        where: {
          status: {
            in: ['pending_approval', 'for_clarification']
          }
        },
        include: {
          request: {
            select: {
              id: true,
              formData: true
            }
          }
        },
        take: 100 // Limit to prevent memory issues
      });

      return approvals;

    } catch (error) {
      console.error('❌ Database query failed:', error);
      return []; // Return empty array to prevent crashes
    }
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
   * Health check - can be called to verify service status
   */
  getStatus(): { isProcessing: boolean; lastRun?: string } {
    return {
      isProcessing: this.isProcessing,
      lastRun: new Date().toISOString()
    };
  }
}

export const safeApprovalReminderService = SafeApprovalReminderService.getInstance();
