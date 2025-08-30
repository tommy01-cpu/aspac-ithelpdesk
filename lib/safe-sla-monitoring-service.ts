import { prisma } from './prisma';
import { sendSLAEscalationEmail } from './database-email-templates';

/**
 * SAFE SLA Monitoring Service
 * - Monitors SLA compliance for all open requests
 * - Sends escalation emails when SLA thresholds are breached
 * - Auto-closes resolved requests after 10 days
 * - Designed to NOT affect the main system even if it fails
 */
class SafeSLAMonitoringService {
  private static instance: SafeSLAMonitoringService;
  private isProcessing = false;
  private maxRetries = 3;
  private batchSize = 10; // Process requests in small batches

  private constructor() {}

  static getInstance(): SafeSLAMonitoringService {
    if (!SafeSLAMonitoringService.instance) {
      SafeSLAMonitoringService.instance = new SafeSLAMonitoringService();
    }
    return SafeSLAMonitoringService.instance;
  }

  /**
   * MAIN SLA MONITORING PROCESS - runs every 30 minutes
   * Checks SLA compliance and sends escalation emails
   */
  async monitorSLACompliance(): Promise<{ success: boolean; results?: any; error?: string }> {
    if (this.isProcessing) {
      console.log('⏰ SLA monitoring already processing, skipping...');
      return { success: false, error: 'Already processing' };
    }

    try {
      this.isProcessing = true;
      console.log('⏰ Starting SAFE SLA monitoring process...');

      const result = await this.processSLAMonitoringIsolated();
      
      console.log('✅ SLA monitoring completed safely');
      return { success: true, results: result };

    } catch (error) {
      console.error('❌ SLA monitoring failed safely (system protected):', error);
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
   * AUTO-CLOSE RESOLVED REQUESTS after 10 days
   * Runs daily to check for requests that need auto-closing
   */
  async autoCloseResolvedRequests(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('🔄 Starting auto-close process for resolved requests...');

      const result = await this.processAutoCloseIsolated();
      
      console.log('✅ Auto-close process completed safely');
      return { success: true, results: result };

    } catch (error) {
      console.error('❌ Auto-close process failed safely (system protected):', error);
      await this.logErrorSafely(error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Isolated SLA monitoring process with timeout protection
   */
  private async processSLAMonitoringIsolated(): Promise<any> {
    const results = {
      requestsChecked: 0,
      escalationsSent: 0,
      escalationsFailed: 0,
      errors: [] as string[]
    };

    try {
      // Get all open requests with timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 15000)
      );

      const openRequests = await Promise.race([
        this.getOpenRequestsWithSLA(),
        timeoutPromise
      ]) as any[];

      if (!openRequests || openRequests.length === 0) {
        console.log('📋 No open requests found for SLA monitoring');
        return results;
      }

      console.log(`⏰ Found ${openRequests.length} open requests to check SLA compliance`);

      // Process in batches to avoid memory issues
      const batches = this.chunkArray(openRequests, this.batchSize);

      for (const batch of batches) {
        await this.processSLABatchSafely(batch, results);
        await this.delay(1000); // 1-second delay between batches
      }

      return results;

    } catch (error) {
      console.error('❌ Error in SLA monitoring process:', error);
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return results;
    }
  }

  /**
   * Isolated auto-close process with timeout protection
   */
  private async processAutoCloseIsolated(): Promise<any> {
    const results = {
      requestsChecked: 0,
      requestsClosed: 0,
      closureFailed: 0,
      errors: [] as string[]
    };

    try {
      // Get resolved requests older than 10 days
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 15000)
      );

      const resolvedRequests = await Promise.race([
        prisma.request.findMany({
          where: {
            status: 'resolved',
            updatedAt: {
              lte: tenDaysAgo
            }
          },
          include: {
            user: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          take: 50 // Limit to prevent memory issues
        }),
        timeoutPromise
      ]) as any[];

      if (!resolvedRequests || resolvedRequests.length === 0) {
        console.log('📋 No resolved requests found that need auto-closing');
        return results;
      }

      console.log(`🔄 Found ${resolvedRequests.length} resolved requests to auto-close`);

      // Process each request
      for (const request of resolvedRequests) {
        try {
          results.requestsChecked++;

          // Update request status to closed
          await this.autoCloseRequestSafely(request);
          
          results.requestsClosed++;
          console.log(`✅ Auto-closed request ${request.id} (resolved 10+ days ago)`);

        } catch (error) {
          results.closureFailed++;
          const errorMsg = `Failed to auto-close request ${request.id}: ${error instanceof Error ? error.message : 'Unknown'}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      return results;

    } catch (error) {
      console.error('❌ Error in auto-close process:', error);
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return results;
    }
  }

  /**
   * Process SLA batch safely - each request isolated
   */
  private async processSLABatchSafely(batch: any[], results: any): Promise<void> {
    for (const request of batch) {
      try {
        results.requestsChecked++;

        // Check if SLA is breached
        const slaStatus = await this.checkSLABreach(request);
        
        if (slaStatus.isBreached && slaStatus.shouldEscalate) {
          // Send escalation email
          await this.sendSLAEscalationSafely(request, slaStatus);
          results.escalationsSent++;
          console.log(`⚠️ SLA escalation sent for request ${request.id}`);
        }

      } catch (error) {
        results.escalationsFailed++;
        const errorMsg = `Failed to process SLA for request ${request.id}: ${error instanceof Error ? error.message : 'Unknown'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
  }

  /**
   * Check if request has breached SLA (response time or resolution time)
   */
  private async checkSLABreach(request: any): Promise<{
    isBreached: boolean;
    shouldEscalate: boolean;
    hoursOverdue?: number;
    breachType?: string;
    slaService?: any;
  }> {
    try {
      // Get SLA configuration for this request's template
      const slaService = await this.getSLAServiceForRequest(request);
      
      if (!slaService) {
        return { isBreached: false, shouldEscalate: false };
      }

      // Calculate time since request creation
      const now = new Date();
      const createdAt = new Date(request.createdAt);
      const hoursElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

      // Check response time breach (initial response to customer)
      const isResponseBreached = hoursElapsed > slaService.responseTime;
      
      // Check resolution time breach (total time to resolve)
      const resolutionTimeLimit = slaService.resolutionHours || (slaService.responseTime * 6); // Fallback: 6x response time
      const isResolutionBreached = hoursElapsed > resolutionTimeLimit;
      
      // Determine breach type and severity
      let breachType = '';
      let isBreached = false;
      let hoursOverdue = 0;
      
      if (isResolutionBreached) {
        breachType = 'resolution';
        isBreached = true;
        hoursOverdue = hoursElapsed - resolutionTimeLimit;
      } else if (isResponseBreached) {
        breachType = 'response';
        isBreached = true;
        hoursOverdue = hoursElapsed - slaService.responseTime;
      }
      
      // Check if escalation is needed
      const shouldEscalate = slaService.autoEscalate && 
                            isBreached && 
                            hoursElapsed > (slaService.responseTime + slaService.escalationTime);

      return {
        isBreached,
        shouldEscalate,
        hoursOverdue,
        breachType,
        slaService
      };

    } catch (error) {
      console.error('Error checking SLA breach:', error);
      return { isBreached: false, shouldEscalate: false };
    }
  }

  /**
   * Get SLA service configuration for a request
   */
  private async getSLAServiceForRequest(request: any): Promise<any> {
    try {
      // Find SLA service based on template ID
      const template = await prisma.template.findFirst({
        where: { id: request.templateId },
        include: {
          slaService: {
            include: {
              escalationLevels: true
            }
          }
        }
      });

      // If template has SLA service, use it
      if (template?.slaService) {
        return template.slaService;
      }

      // Fallback: Use default SLA rules based on request priority
      return this.getDefaultSLAByPriority(request.priority);

    } catch (error) {
      console.error('Error getting SLA service:', error);
      return this.getDefaultSLAByPriority(request.priority || 'Low');
    }
  }

  /**
   * Get default SLA rules based on your Priority enum: Low, Medium, High, Top
   */
  private getDefaultSLAByPriority(priority: string): any {
    const slaRules = {
      'Top': {          // Top Priority (Most Critical)
        responseTime: 4,      // 4 hours response
        resolutionHours: 24,  // 24 hours resolution
        escalationTime: 2,    // Escalate after 2 hours
        autoEscalate: true
      },
      'High': {         // High Priority
        responseTime: 8,      // 8 hours response
        resolutionHours: 72,  // 72 hours (3 days) resolution
        escalationTime: 4,    // Escalate after 4 hours
        autoEscalate: true
      },
      'Medium': {       // Medium Priority
        responseTime: 24,     // 24 hours (1 day) response
        resolutionHours: 168, // 168 hours (7 days) resolution
        escalationTime: 12,   // Escalate after 12 hours
        autoEscalate: true
      },
      'Low': {          // Low Priority
        responseTime: 48,     // 48 hours (2 days) response
        resolutionHours: 336, // 336 hours (14 days) resolution
        escalationTime: 24,   // Escalate after 24 hours
        autoEscalate: false   // No auto-escalation for low priority
      }
    };

    const defaultSLA = slaRules[priority as keyof typeof slaRules] || slaRules['Low'];
    
    return {
      ...defaultSLA,
      priority,
      name: `Default SLA - ${priority} Priority`,
      description: `Auto-generated SLA rules for ${priority} priority requests`,
      excludeHolidays: true,
      excludeWeekends: false,
      operationalHours: true
    };
  }

  /**
   * Send SLA escalation email safely
   */
  private async sendSLAEscalationSafely(request: any, slaStatus: any): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SLA escalation email timeout')), 30000)
    );

    const escalationPromise = this.sendEscalationEmail(request, slaStatus);

    await Promise.race([escalationPromise, timeoutPromise]);
  }

  /**
   * Send escalation email using notify-sla-escalation template
   */
  private async sendEscalationEmail(request: any, slaStatus: any): Promise<void> {
    try {
      // Get technician/support group email
      const technicianEmail = await this.getTechnicianEmailForRequest(request);
      
      if (!technicianEmail) {
        throw new Error('No technician email found for escalation');
      }

      // Prepare email variables
      const variables = {
        request_id: request.id.toString(),
        requester_name: `${request.user.emp_fname} ${request.user.emp_lname}`,
        requester_email: request.user.emp_email || 'N/A',
        hours_overdue: slaStatus.hoursOverdue?.toString() || '0',
        breach_type: slaStatus.breachType || 'response', // 'response' or 'resolution'
        sla_response_time: slaStatus.slaService?.responseTime?.toString() || 'N/A',
        sla_resolution_time: slaStatus.slaService?.resolutionHours?.toString() || 'N/A',
        request_priority: this.getRequestPriority(request),
        request_summary: this.getRequestSummary(request),
        escalation_level: '1', // Can be enhanced to track escalation levels
        dashboard_url: `${process.env.NEXTAUTH_URL}/dashboard`,
        priority_sla_rules: this.formatPrioritySLARules(request.priority)
      };

      // Send escalation email using template ID 19 (notify-sla-escalation)
      const success = await sendSLAEscalationEmail(technicianEmail, variables);
      
      if (!success) {
        throw new Error('Failed to send SLA escalation email');
      }

      // Log escalation in request history
      await this.logSLAEscalation(request.id, slaStatus);

    } catch (error) {
      throw new Error(`SLA escalation email failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Auto-close resolved request safely
   */
  private async autoCloseRequestSafely(request: any): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auto-close timeout')), 10000)
    );

    const closePromise = this.closeRequestSafely(request);

    await Promise.race([closePromise, timeoutPromise]);
  }

  /**
   * Close request and log the action
   */
  private async closeRequestSafely(request: any): Promise<void> {
    try {
      // Update request status to closed
      await prisma.request.update({
        where: { id: request.id },
        data: { 
          status: 'closed',
          updatedAt: new Date()
        }
      });

      // Log closure in request history
      await prisma.requestHistory.create({
        data: {
          requestId: request.id,
          action: 'Status Changed to Closed',
          details: 'Auto-closed after 10 days in resolved status',
          actorId: 1, // System user ID
          actorName: 'System',
          actorType: 'system',
          timestamp: new Date()
        }
      });

      console.log(`✅ Request ${request.id} auto-closed successfully`);

    } catch (error) {
      throw new Error(`Failed to close request: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Get open requests that need SLA monitoring
   */
  private async getOpenRequestsWithSLA(): Promise<any[]> {
    try {
      const requests = await prisma.request.findMany({
        where: {
          status: {
            in: ['open', 'on_hold']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true
            }
          }
        },
        take: 100, // Limit to prevent memory issues
        orderBy: {
          createdAt: 'asc' // Oldest first for SLA monitoring
        }
      });

      return requests;

    } catch (error) {
      console.error('❌ Database query failed:', error);
      return [];
    }
  }

  /**
   * Get technician email for escalation
   */
  private async getTechnicianEmailForRequest(request: any): Promise<string | null> {
    try {
      // This should be enhanced based on your assignment logic
      // For now, return the first available technician
      const technician = await prisma.users.findFirst({
        where: {
          isTechnician: true,
          emp_status: 'active'
        },
        select: {
          emp_email: true
        }
      });

      return technician?.emp_email || null;

    } catch (error) {
      console.error('Error getting technician email:', error);
      return null;
    }
  }

  /**
   * Log SLA escalation in request history
   */
  private async logSLAEscalation(requestId: number, slaStatus: any): Promise<void> {
    try {
      await prisma.requestHistory.create({
        data: {
          requestId,
          action: 'SLA Escalation',
          details: `SLA escalation triggered - ${slaStatus.hoursOverdue} hours overdue`,
          actorId: 1, // System user ID
          actorName: 'System',
          actorType: 'system',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log SLA escalation:', error);
    }
  }

  /**
   * Utility functions
   */
  private getRequestPriority(request: any): string {
    try {
      const formData = request.formData;
      return formData.priority || 'Medium';
    } catch {
      return 'Medium';
    }
  }

  private getRequestSummary(request: any): string {
    try {
      const formData = request.formData;
      return formData.description || formData.issue_description || 'No description available';
    } catch {
      return 'No description available';
    }
  }

  /**
   * Format priority SLA rules for email template
   */
  private formatPrioritySLARules(priority: string): string {
    const sla = this.getDefaultSLAByPriority(priority);
    return `${priority} Priority: ${sla.responseTime}h response, ${sla.resolutionHours}h resolution`;
  }

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
   * Safe error logging
   */
  private async logErrorSafely(error: any): Promise<void> {
    try {
      console.error('🚨 SLA MONITORING ERROR:', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } catch (logError) {
      console.error('Failed to log SLA monitoring error:', logError);
    }
  }

  /**
   * Health check
   */
  getStatus(): { isProcessing: boolean; lastRun?: string } {
    return {
      isProcessing: this.isProcessing,
      lastRun: new Date().toISOString()
    };
  }

  /**
   * Manual trigger for testing
   */
  async manualTriggerSLA(): Promise<any> {
    return await this.monitorSLACompliance();
  }

  async manualTriggerAutoClose(): Promise<any> {
    return await this.autoCloseResolvedRequests();
  }
}

export const safeSLAMonitoringService = SafeSLAMonitoringService.getInstance();
