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
      console.log('📧 Calling approval reminders API...');
      
      // Use NEXTAUTH_URL environment variable directly
      const baseUrl = process.env.NEXTAUTH_URL || 'https://ithelpdesk.aspacphils.com.ph';

      console.log('📧 Using API base URL:', baseUrl);
      
      // Call the actual scheduled task API that handles all approval reminders
      const response = await fetch(`${baseUrl}/api/scheduled-tasks/approval-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📧 Approval reminders API response:', result);

      return {
        processed: result.totalPendingApprovals || 0,
        successful: result.remindersSent || 0,
        failed: (result.totalPendingApprovals || 0) - (result.remindersSent || 0),
        errors: result.success ? [] : [result.message || 'Unknown error'],
        apiResult: result
      };

    } catch (error) {
      console.error('❌ Error calling approval reminders API:', error);
      
      // More specific error handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout (30s)';
        } else if (error.message.includes('fetch failed')) {
          errorMessage = 'Network connection failed';
        } else {
          errorMessage = error.message;
        }
      }
      
      results.errors.push(errorMessage);
      return results;
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
