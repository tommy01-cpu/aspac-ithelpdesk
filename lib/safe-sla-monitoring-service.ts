import { prisma } from './prisma';
import { sendSLAEscalationEmail, sendRequestClosedCCEmail, sendEmailWithTemplateId, sendEmail } from './database-email-templates';
import { formatStatusForDisplay } from './status-colors';
import { createNotification } from './notifications';

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
  private isAutoClosing = false; // Add auto-close lock
  private maxRetries = 3;
  private batchSize = 10; // Process requests in small batches

  private constructor() {
    // Bind all methods to ensure proper 'this' context
    this.monitorSLACompliance = this.monitorSLACompliance.bind(this);
    this.autoCloseResolvedRequests = this.autoCloseResolvedRequests.bind(this);
    this.manualTriggerSLA = this.manualTriggerSLA.bind(this);
    this.manualTriggerAutoClose = this.manualTriggerAutoClose.bind(this);
  }

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

      // Check if this instance is properly initialized
      if (!this || typeof this.processSLAMonitoringIsolated !== 'function') {
        throw new Error('SLA Monitoring Service not properly initialized');
      }

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
    if (this.isAutoClosing) {
      console.log('🔄 Auto-close already processing, skipping...');
      return { success: false, error: 'Auto-close already in progress' };
    }

    try {
      this.isAutoClosing = true;
      console.log('🔄 Starting auto-close process for resolved requests...');

      // Check if this instance is properly initialized
      if (!this || typeof this.processAutoCloseIsolated !== 'function') {
        throw new Error('Auto-close Service not properly initialized');
      }

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
    } finally {
      this.isAutoClosing = false;
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
      
      // TESTING: Uncomment below for 5-minute testing
      // const fiveMinutesAgo = new Date();
      // fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 15000)
      );

      // Get all resolved requests and filter by resolvedAt timestamp in formData
      const allResolvedRequests = await Promise.race([
        prisma.request.findMany({
          where: {
            status: 'resolved'
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
          take: 100 // Get more candidates to filter by resolvedAt
        }),
        timeoutPromise
      ]) as any[];

      console.log(`🔍 Found ${allResolvedRequests.length} resolved requests in database`);
      
      // Log details of each resolved request for debugging
      allResolvedRequests.forEach(request => {
        const resolvedAt = request.formData?.resolution?.resolvedAt;
        console.log(`📋 Request ${request.id}: resolvedAt = ${resolvedAt || 'MISSING'}, status = ${request.status}`);
      });

      // Filter by actual resolution timestamp from formData
      const resolvedRequests = allResolvedRequests.filter(request => {
        const resolvedAt = request.formData?.resolution?.resolvedAt;
        if (!resolvedAt) {
          console.log(`⚠️ Request ${request.id} has no resolvedAt timestamp in formData`);
          return false; // Skip requests without resolution timestamp
        }
        
        const resolvedTime = new Date(resolvedAt);
        const isOldEnough = resolvedTime <= tenDaysAgo;
        // TESTING: For 5-minute testing, use: resolvedTime <= fiveMinutesAgo;
        
        console.log(`🔍 Request ${request.id}: resolved at ${resolvedTime.toLocaleString()}, cutoff time ${tenDaysAgo.toLocaleString()}, eligible: ${isOldEnough}`);
        
        if (isOldEnough) {
          console.log(`✅ Request ${request.id} resolved at ${resolvedTime.toLocaleString()}, eligible for auto-close`);
        }
        
        return isOldEnough;
      });

      if (!resolvedRequests || resolvedRequests.length === 0) {
        console.log('📋 No resolved requests found that need auto-closing (10 days)');
        return results;
      }

      console.log(`🔄 Found ${resolvedRequests.length} resolved requests to auto-close (10 days)`);

      // Process each request
      for (const request of resolvedRequests) {
        try {
          results.requestsChecked++;

          // Update request status to closed
          await this.autoCloseRequestSafely(request);
          
          results.requestsClosed++;
          console.log(`✅ Auto-closed request ${request.id} (resolved 10+ days ago based on resolution date)`);

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
        
        if (slaStatus.isBreached) {
          // Send escalation email for any SLA breach
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
   * NOW USES slaDueDate and respects slaStop flag
   */
  private async checkSLABreach(request: any): Promise<{
    isBreached: boolean;
    hoursOverdue?: number;
    breachType?: string;
    slaService?: any;
    actualElapsed?: number;
    slaLimit?: number;
  }> {
    try {
      // Skip SLA monitoring if SLA is currently stopped
      const formData = request.formData;
      if (formData && formData.slaStop === true) {
        console.log(`⏸️ Skipping request ${request.id} - SLA timer is stopped (slaStop: true)`);
        return { isBreached: false };
      }

      // Get SLA due date from form data (already calculated with holidays, operational hours, etc.)
      const slaDueDate = formData?.slaDueDate;
      if (!slaDueDate) {
        console.warn(`No SLA due date found for request ${request.id}`);
        return { isBreached: false };
      }

      // Get SLA configuration for escalation settings
      const slaService = await this.getSLAServiceForRequest(request);
      if (!slaService) {
        return { isBreached: false };
      }

      const now = new Date();
      const dueDate = new Date(slaDueDate);
      
      // Check if SLA is breached (current time > due date)
      const isBreached = now > dueDate;
      
      if (!isBreached) {
        console.log(`✅ Request ${request.id} SLA OK - Due: ${dueDate.toLocaleString()}, Now: ${now.toLocaleString()}`);
        return { isBreached: false };
      }

      // Calculate hours overdue
      const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
      const slaHours = parseFloat(formData?.slaHours || '0');
      
      // SLA is breached - escalation will be sent

      console.log(`⚠️ Request ${request.id} SLA BREACHED:`, {
        dueDate: dueDate.toLocaleString(),
        now: now.toLocaleString(),
        hoursOverdue: hoursOverdue.toFixed(2),
        slaHours,
        slaStop: formData?.slaStop || false
      });

      return {
        isBreached: true,
        hoursOverdue,
        breachType: 'resolution', // Based on due date which represents final resolution time
        slaService,
        actualElapsed: hoursOverdue + slaHours, // Total time including overdue
        slaLimit: slaHours
      };

    } catch (error) {
      console.error('Error checking SLA breach:', error);
      return { isBreached: false };
    }
  }

  /**
   * Determine if a request is an incident or service request
   */
  private getRequestType(request: any): 'incident' | 'service' {
    try {
      // First try to get type from template
      if (request.template?.type) {
        return request.template.type.toLowerCase() === 'incident' ? 'incident' : 'service';
      }
      
      // Try to get from formData if available
      if (request.formData?.type) {
        return request.formData.type.toLowerCase() === 'incident' ? 'incident' : 'service';
      }
      
      // Check template name/title for keywords
      const templateName = request.template?.name || '';
      const incidentKeywords = ['incident', 'outage', 'emergency', 'critical', 'down', 'failure'];
      
      const isIncident = incidentKeywords.some(keyword => 
        templateName.toLowerCase().includes(keyword)
      );
      
      return isIncident ? 'incident' : 'service';
    } catch (error) {
      console.warn(`Could not determine request type for ${request.id}, defaulting to 'service':`, error);
      return 'service'; // Default to service if unable to determine
    }
  }

  /**
   * Get SLA service configuration for a request
   */
  private async getSLAServiceForRequest(request: any): Promise<any> {
    try {
      // Convert templateId to integer if it's a string
      const templateId = typeof request.templateId === 'string' 
        ? parseInt(request.templateId, 10) 
        : request.templateId;

      // Skip if templateId is not a valid number
      if (!templateId || isNaN(templateId)) {
        console.warn(`Invalid template ID for request ${request.id}: ${request.templateId}`);
        return this.getDefaultSLAByPriority(request.priority || 'Low');
      }

      // Find SLA service based on template ID
      const template = await prisma.template.findFirst({
        where: { id: templateId },
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
   * Get default SLA rules based on Priority and Type (incident vs service)
   */
  private getDefaultSLAByPriority(priority: string, type: 'incident' | 'service' = 'service'): any {
    // Define SLA rules for INCIDENT requests
    const incidentSlaRules = {
      'Top': {          // Top Priority Incidents (Most Critical)
        responseTime: 2,      // 2 hours response (faster for incidents)
        resolutionHours: 8,   // 8 hours resolution (faster for incidents)
        escalationTime: 1,    // Escalate after 1 hour
        autoEscalate: true
      },
      'High': {         // High Priority Incidents
        responseTime: 4,      // 4 hours response
        resolutionHours: 24,  // 24 hours (1 day) resolution
        escalationTime: 2,    // Escalate after 2 hours
        autoEscalate: true
      },
      'Medium': {       // Medium Priority Incidents
        responseTime: 8,      // 8 hours response
        resolutionHours: 48,  // 48 hours (2 days) resolution
        escalationTime: 4,    // Escalate after 4 hours
        autoEscalate: true
      },
      'Low': {          // Low Priority Incidents
        responseTime: 24,     // 24 hours (1 day) response
        resolutionHours: 72,  // 72 hours (3 days) resolution
        escalationTime: 8,    // Escalate after 8 hours
        autoEscalate: true
      }
    };

    // Define SLA rules for SERVICE requests
    const serviceSlaRules = {
      'Top': {          // Top Priority Services
        responseTime: 4,      // 4 hours response
        resolutionHours: 24,  // 24 hours resolution
        escalationTime: 2,    // Escalate after 2 hours
        autoEscalate: true
      },
      'High': {         // High Priority Services
        responseTime: 8,      // 8 hours response
        resolutionHours: 72,  // 72 hours (3 days) resolution
        escalationTime: 4,    // Escalate after 4 hours
        autoEscalate: true
      },
      'Medium': {       // Medium Priority Services
        responseTime: 24,     // 24 hours (1 day) response
        resolutionHours: 168, // 168 hours (7 days) resolution
        escalationTime: 12,   // Escalate after 12 hours
        autoEscalate: true
      },
      'Low': {          // Low Priority Services
        responseTime: 48,     // 48 hours (2 days) response
        resolutionHours: 336, // 336 hours (14 days) resolution
        escalationTime: 24,   // Escalate after 24 hours
        autoEscalate: false   // No auto-escalation for low priority services
      }
    };

    // Select the appropriate rule set based on type
    const slaRules = type === 'incident' ? incidentSlaRules : serviceSlaRules;
    const defaultSLA = slaRules[priority as keyof typeof slaRules] || slaRules['Low'];
    
    return {
      ...defaultSLA,
      priority,
      type,
      name: `Default SLA - ${priority} Priority ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: `Auto-generated SLA rules for ${priority} priority ${type} requests`,
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
      // Get escalation email addresses based on SLA configuration
      const escalationEmails = await this.getTechnicianEmailForRequest(request);
      
      if (!escalationEmails || escalationEmails.length === 0) {
        throw new Error('No escalation email addresses found');
      }

      console.log(`Sending SLA escalation to: ${escalationEmails.join(', ')}`);

      // Prepare email variables to match the template
      const variables = {
        // Template variables (capitalized as expected by template)
        Request_ID: request.id.toString(),
        Request_Status: request.status || 'Open',
        Due_By_Date: slaStatus.slaService?.slaDueDate || request.formData?.slaDueDate || 'N/A',
        Technician_Name: request.formData?.assignedTechnician || 'Unassigned',
        Request_Title: this.getRequestSummary(request),
        Request_Description: this.getRequestDescription(request),
        Request_URL: `${process.env.NEXTAUTH_URL || 'http://192.168.1.85:3000'}/requests/view/${request.id}`,
        
        // Legacy variables (for backward compatibility)
        request_id: request.id.toString(),
        requester_name: `${request.user.emp_fname} ${request.user.emp_lname}`,
        requester_email: request.user.emp_email || 'N/A',
        hours_overdue: slaStatus.hoursOverdue?.toString() || '0',
        breach_type: slaStatus.breachType || 'response',
        sla_response_time: slaStatus.slaService?.responseTime?.toString() || 'N/A',
        sla_resolution_time: slaStatus.slaService?.resolutionHours?.toString() || 'N/A',
        request_priority: this.getRequestPriority(request),
        request_summary: this.getRequestSummary(request),
        escalation_level: '1',
        dashboard_url: `${process.env.NEXTAUTH_URL}/dashboard`,
        priority_sla_rules: this.formatPrioritySLARules(request.priority)
      };

      // Send escalation email to all targets
      for (const email of escalationEmails) {
        const success = await sendSLAEscalationEmail(email, variables);
        
        if (!success) {
          console.error(`Failed to send SLA escalation email to ${email}`);
        } else {
          console.log(`✅ SLA escalation email sent to ${email}`);
        }
      }

      // Note: History logging removed for escalations per user request

    } catch (error) {
      throw new Error(`SLA escalation email failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Auto-close resolved request safely
   */
  private async autoCloseRequestSafely(request: any): Promise<void> {
    // Double-check the request is still in resolved status before processing
    const currentRequest = await prisma.request.findUnique({
      where: { id: request.id },
      select: { status: true }
    });

    if (!currentRequest || currentRequest.status !== 'resolved') {
      console.log(`⚠️ Request ${request.id} is no longer in resolved status, skipping auto-close`);
      return;
    }

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auto-close timeout')), 30000) // Increased to 30 seconds
    );

    const closePromise = this.closeRequestSafely(request);

    await Promise.race([closePromise, timeoutPromise]);
  }

  /**
   * Send notifications to requester when request is auto-closed
   */
  private async notifyRequesterOfClosure(request: any): Promise<void> {
    try {
      // Create app notification
      await createNotification({
        userId: request.userId,
        type: 'REQUEST_CLOSED',
        title: 'Request Auto-Closed',
        message: `Your request #${request.id} has been automatically closed by the system after being resolved for 10 days.`,
        data: {
          requestId: request.id,
          status: 'closed',
          closureReason: 'auto-closed'
        }
      });

      console.log(`✅ App notification sent to requester for request ${request.id}`);

      // For email, we'll use the resolved template as there's no specific closed template
      // This is better than no email notification at all
      if (request.user?.emp_email) {
        // Note: Using resolved template as fallback since no specific closed template exists
        console.log(`📧 Sending closure notification email to ${request.user.emp_email} for request ${request.id}`);
        
        // We could add a specific closed email template later, for now just log
        console.log(`📝 Email notification would be sent here (no closed template found, only CC template available)`);
      }

    } catch (error) {
      // Don't fail the entire close operation if notifications fail
      console.error(`⚠️ Failed to send requester notifications for request ${request.id}:`, error);
    }
  }

  /**
   * Send CC notifications for closed request
   */
  private async sendClosedCCNotifications(request: any): Promise<void> {
    try {
      // Check if request has CC emails in formData field 10
      if (request.formData?.[10]) {
        const ccEmails = request.formData[10];
        
        // Handle both array and string formats
        let emailArray: string[] = [];
        
        if (Array.isArray(ccEmails)) {
          // Already an array - filter out empty values
          emailArray = ccEmails.filter(email => email && email.trim && email.trim() !== '');
        } else if (typeof ccEmails === 'string' && ccEmails.trim() !== '') {
          // String format - split by comma
          emailArray = ccEmails.split(',').map((email: string) => email.trim()).filter(email => email !== '');
        }
        
        // Only send if there are valid CC emails
        if (emailArray.length > 0) {
          console.log(`📧 Sending CC notifications for closed request ${request.id} to: ${emailArray.join(', ')}`);
          
          const variables = {
            Request_ID: request.id.toString(),
            Request_Status: formatStatusForDisplay('closed'),
            Request_Subject: request.formData?.[8] || 'Request',
            Request_Description: request.formData?.[9] || '',
            Requester_Name: `${request.user?.emp_fname || ''} ${request.user?.emp_lname || ''}`.trim(),
            Request_Resolution: request.formData?.resolution?.description || 'Auto-closed by system',
            CLOSED_DATE: new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"})
          };
          
          await sendRequestClosedCCEmail(emailArray, variables);
          
          console.log(`✅ CC notifications sent successfully for request ${request.id}`);
        } else {
          console.log(`📋 No valid CC emails found for request ${request.id}`);
        }
      }
    } catch (error) {
      // Don't fail the entire close operation if CC notification fails
      console.error(`⚠️ Failed to send CC notifications for request ${request.id}:`, error);
    }
  }

  /**
   * Send notification and email to requester about auto-closure
   */
  private async sendRequesterClosedNotification(request: any): Promise<void> {
    console.log(`🔍 DEBUG: Starting sendRequesterClosedNotification for request ${request.id}`);
    
    try {
      const requesterName = `${request.user?.emp_fname || ''} ${request.user?.emp_lname || ''}`.trim();
      const requestTitle = request.formData?.[8] || 'Your Request';
      
      console.log(`🔍 DEBUG: Request details - ID: ${request.id}, Requester: ${requesterName}, Title: ${requestTitle}`);
      console.log(`🔍 DEBUG: User object:`, request.user);
      console.log(`🔍 DEBUG: User ID: ${request.userId}, Email: ${request.user?.emp_email}`);
      
      // Create app notification
      console.log(`🔍 DEBUG: Creating app notification for user ${request.userId}`);
      await createNotification({
        userId: request.userId,
        type: 'REQUEST_CLOSED',
        title: 'Request Auto-Closed',
        message: `Your request "${requestTitle}" has been automatically closed by the system after being resolved for 10 days.`,
        data: {
          requestId: request.id,
          action: 'auto_closed',
          closedAt: new Date().toISOString()
        }
      });
      console.log(`✅ DEBUG: App notification created successfully`);

      // Send email notification using database template ID 31
      const variables = {
        Request_ID: request.id.toString(),
        Request_Status: formatStatusForDisplay('closed'),
        Request_Subject: request.formData?.[8] || 'Request',
        Request_Description: request.formData?.[9] || '',
        Requester_Name: requesterName,
        Request_Resolution: request.formData?.resolution?.description || 'Auto-closed by system',
        CLOSED_DATE: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      };

      console.log(`🔍 DEBUG: Email variables prepared:`, variables);

      // Send email using template ID 31 (REQUEST_CLOSED_REQUESTER)
      console.log(`🔍 DEBUG: Attempting to get email template ID 31 for request ${request.id}`);
      
      const emailContent = await sendEmailWithTemplateId(31, variables);
      console.log(`🔍 DEBUG: Email template result:`, emailContent ? 'SUCCESS' : 'FAILED');
      
      if (!emailContent) {
        console.error(`❌ DEBUG: Template ID 31 not found or failed to load for request ${request.id}`);
        console.log(`📝 DEBUG: Available variables:`, variables);
        console.log(`🔍 DEBUG: Function will exit early due to missing template`);
        return; // Exit early if template doesn't exist
      }
      
      if (!request.user?.emp_email) {
        console.error(`❌ DEBUG: No email address found for user ${request.userId} on request ${request.id}`);
        console.log(`🔍 DEBUG: User object:`, request.user);
        console.log(`🔍 DEBUG: Function will exit early due to missing email`);
        return;
      }
      
      console.log(`📧 DEBUG: Sending email to ${request.user.emp_email} using template ID 31`);
      console.log(`📧 DEBUG: Email subject: ${emailContent.subject}`);
      console.log(`📧 DEBUG: Email content length: ${emailContent.htmlContent?.length || 0} chars`);
      
      await sendEmail({
        to: [request.user.emp_email],
        subject: emailContent.subject,
        message: emailContent.textContent,
        htmlMessage: emailContent.htmlContent,
      });
      
      console.log(`✅ DEBUG: Requester notification sent to ${request.user.emp_email} for request ${request.id}`);

    } catch (error) {
      // Don't fail the entire close operation if notification fails
      console.error(`❌ DEBUG: Failed to send requester notification for request ${request.id}:`, error);
      console.error(`❌ DEBUG: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    }
    
    console.log(`🔍 DEBUG: Finished sendRequesterClosedNotification for request ${request.id}`);
  }

  /**
   * Close request and log the action
   */
  private async closeRequestSafely(request: any): Promise<void> {
    try {
      // Create Philippine time for closedDate (without UTC conversion)
      const currentTime = new Date();
      const philippineClosedTime = new Date(currentTime.getTime() + (8 * 60 * 60 * 1000));
      const closedDate = philippineClosedTime.toISOString().slice(0, 19).replace('T', ' ');

      // Get current formData and add closedDate
      const currentFormData = request.formData || {};
      const updatedFormData = {
        ...currentFormData,
        closedDate: closedDate
      };

      // Update request status to closed and add closedDate to formData
      await prisma.request.update({
        where: { id: request.id },
        data: { 
          status: 'closed',
          formData: updatedFormData,
          updatedAt: new Date()
        }
      });

      // 📧 Send CC notifications before logging (in case notification fails)
      try {
        const ccPromise = this.sendClosedCCNotifications(request);
        const ccTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('CC notification timeout')), 15000)
        );
        await Promise.race([ccPromise, ccTimeout]);
      } catch (error) {
        console.error(`⚠️ CC notification failed for request ${request.id}:`, error);
        // Continue with the process even if CC notification fails
      }

      // 🔔 Send notification and email to requester using template ID 31
      try {
        const notificationPromise = this.sendRequesterClosedNotification(request);
        const notificationTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Requester notification timeout')), 15000)
        );
        await Promise.race([notificationPromise, notificationTimeout]);
      } catch (error) {
        console.error(`⚠️ Requester notification failed for request ${request.id}:`, error);
        // Continue with the process even if notification fails
      }


      // Log closure in request history
      // Format Philippine time for display
      const philippineTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      // Create proper Philippine time timestamp for database (without timezone conversion)
      const now = new Date();
      // Add 8 hours to UTC to get Philippine time
      const philippineTimestamp = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      await prisma.requestHistory.create({
        data: {
          requestId: request.id,
          action: 'Status Changed to Closed',
          details: `Auto-closed after 10 days from resolution date at ${philippineTime}`, // Removed PHT suffix
          actorId: 1, // System user ID
          actorName: 'System',
          actorType: 'system',
          timestamp: philippineTimestamp // Philippine time for database
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
   * Get escalation email addresses based on SLA incident configuration
   */
  private async getTechnicianEmailForRequest(request: any): Promise<string[] | null> {
    try {
      const formData = request.formData;
      // Handle both slaId and slaid field names for compatibility
      const slaId = formData?.slaId || formData?.slaid;
      
      if (!slaId) {
        console.warn(`❌ No SLA ID found for request ${request.id}`);
        console.log(`🔧 FALLBACK: Using assigned technician email for request ${request.id}`);
        
        // Fallback: Use assigned technician email
        const technicianEmail = formData?.assignedTechnicianEmail;
        if (technicianEmail) {
          console.log(`📧 Using fallback email: ${technicianEmail}`);
          return [technicianEmail];
        }
        
        console.warn(`❌ No fallback email found for request ${request.id}`);
        return null;
      }

      console.log(`🔍 Looking up SLA incident configuration for ID: ${slaId}`);

      // Get SLA incident configuration
      const slaIncident = await prisma.sLAIncident.findUnique({
        where: { id: parseInt(slaId) }
      });

      if (!slaIncident) {
        console.warn(`❌ SLA incident not found for ID ${slaId} in request ${request.id}`);
        console.log(`🔧 FALLBACK: Using assigned technician email for request ${request.id}`);
        
        // Fallback: Use assigned technician email
        const technicianEmail = formData?.assignedTechnicianEmail;
        if (technicianEmail) {
          console.log(`📧 Using fallback email: ${technicianEmail}`);
          return [technicianEmail];
        }
        
        return null;
      }

      if (!slaIncident.resolutionEscalationEnabled) {
        console.log(`❌ SLA escalation not enabled for request ${request.id} (resolutionEscalationEnabled: false)`);
        console.log(`🔧 FALLBACK: Using assigned technician email for request ${request.id}`);
        
        // Fallback: Use assigned technician email
        const technicianEmail = formData?.assignedTechnicianEmail;
        if (technicianEmail) {
          console.log(`📧 Using fallback email: ${technicianEmail}`);
          return [technicianEmail];
        }
        
        return null;
      }

      console.log(`✅ Found SLA incident configuration for request ${request.id}:`, {
        id: slaIncident.id,
        resolutionEscalationEnabled: slaIncident.resolutionEscalationEnabled,
        escalationLevel1: (slaIncident as any).escalationLevel1?.length || 0,
        escalationLevel2: (slaIncident as any).escalationLevel2?.length || 0,
        escalationLevel3: (slaIncident as any).escalationLevel3?.length || 0,
        escalationLevel4: (slaIncident as any).escalationLevel4?.length || 0
      });

      // Check escalation history to determine current level
      const escalationHistory = formData?.history?.escalations || [];
      const currentLevel = this.getCurrentEscalationLevel(escalationHistory, slaIncident);
      
      if (!currentLevel) {
        console.log(`❌ No escalation level needed for request ${request.id}`);
        return null;
      }

      console.log(`🎯 Using escalation level ${currentLevel.level} for request ${request.id}`);

      console.log(`Processing escalation level ${currentLevel.level} for request ${request.id}`);

      // Resolve escalation targets to email addresses
      const emailAddresses = await this.resolveEscalationTargets(
        currentLevel.escalateTo, 
        formData
      );

      // Update escalation history to prevent re-sending
      await this.updateEscalationHistory(request.id, currentLevel.level);

      return emailAddresses;

    } catch (error) {
      console.error('Error getting escalation emails:', error);
      return null;
    }
  }

  /**
   * Determine which escalation level to process
   */
  private getCurrentEscalationLevel(escalationHistory: any[], slaIncident: any): any {
    const sentLevels = escalationHistory.map(h => h.level);

    // Check levels in order
    if (!sentLevels.includes(1) && slaIncident.resolutionEscalationEnabled) {
      return {
        level: 1,
        escalateTo: slaIncident.escalateTo || [],
        timing: { days: slaIncident.escalateDays, hours: slaIncident.escalateHours }
      };
    }

    if (!sentLevels.includes(2) && slaIncident.level2Enabled) {
      return {
        level: 2,
        escalateTo: slaIncident.level2EscalateTo || [],
        timing: { days: slaIncident.level2Days, hours: slaIncident.level2Hours }
      };
    }

    if (!sentLevels.includes(3) && slaIncident.level3Enabled) {
      return {
        level: 3,
        escalateTo: slaIncident.level3EscalateTo || [],
        timing: { days: slaIncident.level3Days, hours: slaIncident.level3Hours }
      };
    }

    if (!sentLevels.includes(4) && slaIncident.level4Enabled) {
      return {
        level: 4,
        escalateTo: slaIncident.level4EscalateTo || [],
        timing: { days: slaIncident.level4Days, hours: slaIncident.level4Hours }
      };
    }

    return null; // No more levels
  }

  /**
   * Resolve escalation targets to email addresses
   */
  private async resolveEscalationTargets(escalateTo: any[], formData: any): Promise<string[]> {
    const emailAddresses: string[] = [];

    // Handle both JSON string and array formats
    let targets: string[] = [];
    if (Array.isArray(escalateTo)) {
      targets = escalateTo;
    } else if (typeof escalateTo === 'string') {
      try {
        targets = JSON.parse(escalateTo);
      } catch {
        targets = [escalateTo];
      }
    }

    for (const target of targets) {
      if (target === 'AS') {
        // Get assigned technician's email using assignedTechnicianId (which is actually the user ID)
        const userId = formData.assignedTechnicianId;
        console.log(`🔍 AS escalation: Looking for user with ID: ${userId}`);
        
        if (userId) {
          try {
            // Get user email directly since assignedTechnicianId is the user ID
            const user = await prisma.users.findUnique({
              where: { id: parseInt(userId) },
              select: { emp_email: true, emp_fname: true, emp_lname: true }
            });
            
            if (user?.emp_email) {
              emailAddresses.push(user.emp_email);
              console.log(`✅ Added assigned technician email: ${user.emp_email} (userId: ${userId}, name: ${user.emp_fname} ${user.emp_lname})`);
            } else {
              console.warn(`❌ No email found for user ID: ${userId}`);
            }
          } catch (error) {
            console.error(`❌ Error resolving AS escalation for userId ${userId}:`, error);
          }
        } else {
          console.warn(`❌ No assignedTechnicianId found in formData for AS escalation`);
        }
      } else if (target === 'DH') {
        // Get department head of requester's department
        const requesterId = formData.requesterId || formData.userId;
        if (requesterId) {
          const requester = await prisma.users.findUnique({
            where: { id: parseInt(requesterId) }
          });
          
          // You'll need to implement department head logic based on your schema
          // For now, this is a placeholder - adjust based on your department structure
          if (requester?.department) {
            const deptHead = await prisma.users.findFirst({
              where: {
                department: requester.department,
                // Add your department head identification logic here
                // e.g., post_des: { contains: 'head' } or a specific role field
              }
            });
            if (deptHead?.emp_email) {
              emailAddresses.push(deptHead.emp_email);
              console.log(`Added department head email: ${deptHead.emp_email}`);
            }
          }
        }
      } else {
        // Direct user ID
        const user = await prisma.users.findUnique({
          where: { id: parseInt(target) }
        });
        if (user?.emp_email) {
          emailAddresses.push(user.emp_email);
          console.log(`Added user email: ${user.emp_email}`);
        }
      }
    }

    return emailAddresses.filter(email => email); // Remove any null/undefined emails
  }

  /**
   * Update escalation history in request formData
   */
  private async updateEscalationHistory(requestId: number, level: number): Promise<void> {
    try {
      const request = await prisma.request.findUnique({
        where: { id: requestId }
      });

      if (!request) return;

      // Safely handle formData as it could be various types
      const currentFormData = (typeof request.formData === 'object' && request.formData !== null) 
        ? request.formData as any 
        : {};
      
      const currentHistory = currentFormData.history || {};
      const escalations = currentHistory.escalations || [];

      escalations.push({
        level,
        sentAt: new Date().toISOString(),
        timestamp: Date.now()
      });

      await prisma.request.update({
        where: { id: requestId },
        data: {
          formData: {
            ...currentFormData,
            history: {
              ...currentHistory,
              escalations
            }
          }
        }
      });

      console.log(`Updated escalation history for request ${requestId}, level ${level}`);
    } catch (error) {
      console.error('Error updating escalation history:', error);
    }
  }

  /**
   * Log SLA escalation in request history - DISABLED per user request
   */
  private async logSLAEscalation(requestId: number, slaStatus: any): Promise<void> {
    // History logging for escalations has been disabled
    // This function is kept for compatibility but does nothing
    return;
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
      return formData['8'] || formData.title || formData.issue_description || 'No title available';
    } catch {
      return 'No title available';
    }
  }

  /**
   * Get request description from form data
   */
  private getRequestDescription(request: any): string {
    try {
      const formData = request.formData;
      return formData['9'] || formData.description || formData.issue_description || 'No description available';
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
   * Enhanced status check with more details
   */
  getStatus(): { 
    isProcessing: boolean; 
    isAutoClosing: boolean;
    lastRun?: string;
    uptime: string;
    instance: string;
  } {
    return {
      isProcessing: this.isProcessing,
      isAutoClosing: this.isAutoClosing,
      lastRun: new Date().toISOString(),
      uptime: process.uptime().toString() + ' seconds',
      instance: 'SafeSLAMonitoringService-' + Date.now()
    };
  }

  /**
   * Detailed health check with service information
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'processing' | 'error';
    slaMonitoring: {
      isRunning: boolean;
      lastCheck?: string;
      nextCheck?: string;
    };
    autoClose: {
      isRunning: boolean;
      lastCheck?: string;
      nextCheck?: string;
    };
    database: {
      connected: boolean;
      error?: string;
    };
    timestamp: string;
  }> {
    try {
      // Test database connection
      let dbConnected = false;
      let dbError: string | undefined;
      
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbConnected = true;
      } catch (error) {
        dbError = error instanceof Error ? error.message : 'Database connection failed';
      }

      const status = this.isProcessing || this.isAutoClosing ? 'processing' : 
                     !dbConnected ? 'error' : 'healthy';

      return {
        status,
        slaMonitoring: {
          isRunning: this.isProcessing,
          lastCheck: new Date().toISOString(),
          nextCheck: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
        },
        autoClose: {
          isRunning: this.isAutoClosing,
          lastCheck: new Date().toISOString(),
          nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        },
        database: {
          connected: dbConnected,
          error: dbError
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        slaMonitoring: { isRunning: false },
        autoClose: { isRunning: false },
        database: { 
          connected: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualTriggerSLA(): Promise<any> {
    try {
      if (!this || typeof this.monitorSLACompliance !== 'function') {
        throw new Error('SLA monitoring service not properly initialized');
      }
      return await this.monitorSLACompliance();
    } catch (error) {
      console.error('Manual SLA trigger failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Manual trigger failed' 
      };
    }
  }

  async manualTriggerAutoClose(): Promise<any> {
    try {
      if (!this || typeof this.autoCloseResolvedRequests !== 'function') {
        throw new Error('Auto-close service not properly initialized');
      }
      return await this.autoCloseResolvedRequests();
    } catch (error) {
      console.error('Manual auto-close trigger failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Manual trigger failed' 
      };
    }
  }
}

export const safeSLAMonitoringService = SafeSLAMonitoringService.getInstance();
