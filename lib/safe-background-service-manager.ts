import { checkAndGenerateHolidays } from '@/lib/recurring-holidays-service';
import { safeApprovalReminderService } from '@/lib/safe-approval-reminder-service';
import { safeSLAMonitoringService } from '@/lib/safe-sla-monitoring-service';

/**
 * MASTER background service manager - coordinates all background services
 * Multiple safety layers to prevent any background failure from affecting main app
 */
class SafeBackgroundServiceManager {
  private static instance: SafeBackgroundServiceManager;
  private isInitialized = false;
  private services: Map<string, any> = new Map();
  private holidayScheduler: NodeJS.Timeout | null = null;
  private approvalScheduler: NodeJS.Timeout | null = null;
  private slaScheduler: NodeJS.Timeout | null = null;
  private autoCloseScheduler: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SafeBackgroundServiceManager {
    if (!SafeBackgroundServiceManager.instance) {
      SafeBackgroundServiceManager.instance = new SafeBackgroundServiceManager();
    }
    return SafeBackgroundServiceManager.instance;
  }

  /**
   * SAFE initialization of all background services
   */
  async initializeAllServices(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Background services already initialized');
      return;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🔧 DEVELOPMENT MODE: Initializing background services with reduced logging...');
    } else {
      console.log('🚀 PRODUCTION MODE: Initializing SAFE background service manager...');
    }

    try {
      // SAFETY LAYER 1: Initialize each service in isolation
      await this.initializeServiceSafely('holidays', () => {
        this.startHolidayScheduler();
        this.services.set('holidays', { status: 'running', type: 'holiday-scheduler' });
      });

      await this.initializeServiceSafely('approvals', () => {
        this.startApprovalScheduler();
        this.services.set('approvals', { 
          status: 'running', 
          type: 'approval-scheduler',
          service: safeApprovalReminderService 
        });
      });

      await this.initializeServiceSafely('sla-monitoring', () => {
        this.startSLAScheduler();
        this.services.set('sla-monitoring', { 
          status: 'running', 
          type: 'sla-scheduler',
          service: safeSLAMonitoringService 
        });
      });

      await this.initializeServiceSafely('auto-close', () => {
        this.startAutoCloseScheduler();
        this.services.set('auto-close', { 
          status: 'running', 
          type: 'auto-close-scheduler',
          service: safeSLAMonitoringService 
        });
      });

      this.isInitialized = true;
      
      if (isDevelopment) {
        console.log('✅ Background services initialized (dev mode)');
      } else {
        console.log('✅ All background services initialized safely');
        // Start health monitoring only in production
        this.startHealthMonitoring();
      }

    } catch (error) {
      console.error('❌ Background service initialization failed (main app protected):', error);
      // Main app continues running even if background services fail
    }
  }

  /**
   * Initialize a single service with complete error isolation
   */
  private async initializeServiceSafely(serviceName: string, initFn: () => void): Promise<void> {
    try {
      console.log(`🔧 Initializing ${serviceName} service...`);

      // SAFETY LAYER 2: Timeout protection for initialization
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${serviceName} init timeout`)), 30000) // 30 seconds
      );

      const initPromise = new Promise<void>((resolve) => {
        initFn();
        resolve();
      });

      await Promise.race([initPromise, timeoutPromise]);

      console.log(`✅ ${serviceName} service initialized successfully`);

    } catch (error) {
      console.error(`❌ ${serviceName} service failed to initialize (other services continue):`, error);
      // Don't throw - other services should still start
    }
  }

  /**
   * Start approval scheduler - runs daily at 8:00 AM
   */
  private startApprovalScheduler(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log(`📧 [${isDevelopment ? 'DEV' : 'PROD'}] Approval reminder scheduler started (8:00 AM daily)...`);
    
    this.scheduleNext8AM();
  }

  /**
   * Schedule next 8:00 AM run for approval reminders
   */
  private scheduleNext8AM(): void {
    try {
      const now = new Date();
      const next8AM = new Date(now);
      
      // Set to 8:00 AM for production
      next8AM.setHours(8, 0, 0, 0);
      
      // If 8:00 AM already passed today, schedule for tomorrow
      if (next8AM < now) {
        next8AM.setDate(next8AM.getDate() + 1);
      }

      const timeUntil8AM = next8AM.getTime() - now.getTime();

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // Always log in development for debugging
      console.log(`⏰ [${isDevelopment ? 'DEV' : 'PROD'}] Next approval reminder scheduled for: ${next8AM.toLocaleString()}`);
      console.log(`⏰ Time until next run: ${Math.round(timeUntil8AM / 1000 / 60)} minutes`);

      this.approvalScheduler = setTimeout(() => {
        this.runApprovalReminders();
        this.scheduleNext8AM(); // Schedule next day
      }, timeUntil8AM);

    } catch (error) {
      console.error('❌ Error scheduling 8:00 AM approval reminder (will retry in 1 hour):', error);
      
      // Fallback: retry in 1 hour if scheduling fails
      this.approvalScheduler = setTimeout(() => {
        this.scheduleNext8AM();
      }, 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Run approval reminders with safety layers
   */
  private async runApprovalReminders(): Promise<void> {
    try {
      console.log('📧 8:00 AM - Triggering approval reminders...');

      // SAFETY LAYER: Timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Approval reminder timeout')), 3 * 60 * 1000) // 3 minutes max
      );

      const reminderPromise = safeApprovalReminderService.sendDailyReminders();

      const result = await Promise.race([reminderPromise, timeoutPromise]);

      console.log('✅ Approval reminders completed:', result);

    } catch (error) {
      console.error('❌ Approval reminders failed (system protected):', error);
    }
  }

  /**
   * Start SLA monitoring scheduler - runs every 30 minutes
   */
  private startSLAScheduler(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('⏰ SLA monitoring scheduler started (dev mode - reduced logging)');
    } else {
      console.log('⏰ Starting SLA monitoring scheduler (every 30 minutes)...');
    }
    
    this.scheduleNextSLACheck();
  }

  /**
   * Schedule next SLA check - every 30 minutes
   */
  private scheduleNextSLACheck(): void {
    try {
      const intervalMs = 30 * 60 * 1000; // 30 minutes
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!isDevelopment) {
        console.log(`⏰ Next SLA check scheduled in 30 minutes`);
      }

      this.slaScheduler = setTimeout(() => {
        this.runSLAMonitoring();
        this.scheduleNextSLACheck(); // Schedule next check
      }, intervalMs);

    } catch (error) {
      console.error('❌ Error scheduling SLA monitoring (will retry in 1 hour):', error);
      
      // Fallback: retry in 1 hour if scheduling fails
      this.slaScheduler = setTimeout(() => {
        this.scheduleNextSLACheck();
      }, 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Run SLA monitoring with safety layers
   */
  private async runSLAMonitoring(): Promise<void> {
    try {
      console.log('⏰ Running SLA compliance monitoring...');

      // SAFETY LAYER: Timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SLA monitoring timeout')), 5 * 60 * 1000) // 5 minutes max
      );

      const slaPromise = safeSLAMonitoringService.monitorSLACompliance();

      const result = await Promise.race([slaPromise, timeoutPromise]);

      console.log('✅ SLA monitoring completed:', result);

    } catch (error) {
      console.error('❌ SLA monitoring failed (system protected):', error);
    }
  }

  /**
   * Start auto-close scheduler - runs daily at 12:00 AM
   */
  private startAutoCloseScheduler(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🔄 Auto-close scheduler started (dev mode - reduced logging)');
    } else {
      console.log('🔄 Starting auto-close scheduler (12:00 AM daily)...');
    }
    
    this.scheduleNext12AM();
  }

  /**
   * Schedule next 12:00 AM run for auto-close
   */
  private scheduleNext12AM(): void {
    try {
      const now = new Date();
      const next12AM = new Date(now);
      
      // Set to 9:28 AM for testing
      next12AM.setHours(15, 20, 0, 0);
      
      // If 3:20 PM already passed today, schedule for tomorrow
      if (next12AM.getTime() < now.getTime()) {
        next12AM.setDate(next12AM.getDate() + 1);
      }
      
      const timeUntil12AM = next12AM.getTime() - now.getTime();

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!isDevelopment) {
        console.log(`⏰ Next auto-close scheduled for: ${next12AM.toLocaleString()}`);
      }

      this.autoCloseScheduler = setTimeout(() => {
        this.runAutoClose();
        this.scheduleNext12AM(); // Schedule next day
      }, timeUntil12AM);

    } catch (error) {
      console.error('❌ Error scheduling 12AM auto-close (will retry in 1 hour):', error);
      
      // Fallback: retry in 1 hour if scheduling fails
      this.autoCloseScheduler = setTimeout(() => {
        this.scheduleNext12AM();
      }, 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Run auto-close with safety layers
   */
  private async runAutoClose(): Promise<void> {
    try {
      console.log('🔄 9:28 AM - Running auto-close for resolved requests...');

      // SAFETY LAYER: Timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auto-close timeout')), 3 * 60 * 1000) // 3 minutes max
      );

      const autoClosePromise = safeSLAMonitoringService.autoCloseResolvedRequests();

      const result = await Promise.race([autoClosePromise, timeoutPromise]);

      console.log('✅ Auto-close completed:', result);

    } catch (error) {
      console.error('❌ Auto-close failed (system protected):', error);
    }
  }
  private startHolidayScheduler(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log(`🎉 [${isDevelopment ? 'DEV' : 'PROD'}] Holiday scheduler started (12:00 AM daily)...`);
    
    this.scheduleNextMidnight();
  }

  /**
   * Schedule next midnight run for holidays
   */
  private scheduleNextMidnight(): void {
    try {
      const now = new Date();
      const nextMidnight = new Date(now);
      
      // Set to 9:38 AM for testing
      nextMidnight.setHours(16,45, 0, 0);
      
      // If 3:25 PM already passed today, schedule for tomorrow
      if (nextMidnight < now) {
        nextMidnight.setDate(nextMidnight.getDate() + 1);
      }
      
      const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // Always log in development for debugging
      console.log(`⏰ [${isDevelopment ? 'DEV' : 'PROD'}] Next holiday generation scheduled for: ${nextMidnight.toLocaleString()}`);
      console.log(`⏰ Time until next holiday run: ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);

      this.holidayScheduler = setTimeout(() => {
        this.runHolidayGeneration();
        this.scheduleNextMidnight(); // Schedule next day
      }, timeUntilMidnight);

    } catch (error) {
      console.error('❌ Error scheduling 12:00 AM holiday run (will retry in 1 hour):', error);
      
      // Fallback: retry in 1 hour if scheduling fails
      this.holidayScheduler = setTimeout(() => {
        this.scheduleNextMidnight();
      }, 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Run holiday generation with safety layers
   */
  private async runHolidayGeneration(): Promise<void> {
    try {
      console.log('🎉 12:00 AM - Generating recurring holidays...');

      // SAFETY LAYER: Timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Holiday generation timeout')), 2 * 60 * 1000) // 2 minutes max
      );

      const holidayPromise = checkAndGenerateHolidays();

      const result = await Promise.race([holidayPromise, timeoutPromise]);

      console.log('✅ Holiday generation completed:', result);

    } catch (error) {
      console.error('❌ Holiday generation failed (system protected):', error);
    }
  }

  /**
   * Health monitoring that won't crash the main system
   */
  private startHealthMonitoring(): void {
    // Check every 6 hours
    setInterval(() => {
      this.performHealthCheckSafely();
    }, 6 * 60 * 60 * 1000);

    console.log('💓 Background service health monitoring started (6-hour intervals)');
  }

  /**
   * Safe health check that won't affect main system
   */
  private async performHealthCheckSafely(): Promise<void> {
    try {
      const status = this.getSystemStatus();
      
      console.log('💓 Background service health check:', {
        timestamp: new Date().toISOString(),
        services: status.services,
        totalServices: status.totalServices,
        healthyServices: Object.values(status.services).filter(s => s.status === 'running').length
      });

      // Could send to monitoring service here
      // But wrapped in try-catch so it won't crash

    } catch (error) {
      console.error('Health check failed (system protected):', error);
    }
  }

  /**
   * Get complete system status
   */
  getSystemStatus(): {
    initialized: boolean;
    services: Record<string, { status: string; details?: any }>;
    totalServices: number;
  } {
    const status: any = {
      initialized: this.isInitialized,
      services: {},
      totalServices: this.services.size
    };

    try {
      // Check holiday service
      if (this.services.has('holidays')) {
        status.services.holidays = {
          status: this.holidayScheduler ? 'running' : 'stopped',
          details: 'Generates holidays at 12:00 AM daily'
        };
      }

      // Check approval service
      if (this.services.has('approvals')) {
        const approvalService = this.services.get('approvals');
        status.services.approvals = {
          status: approvalService?.status || 'running',
          details: 'Sends reminders at 8:00 AM daily'
        };
      }

      // Check SLA monitoring service
      if (this.services.has('sla-monitoring')) {
        status.services.slaMonitoring = {
          status: this.slaScheduler ? 'running' : 'stopped',
          details: 'Monitors SLA compliance every 30 minutes'
        };
      }

      // Check auto-close service
      if (this.services.has('auto-close')) {
        status.services.autoClose = {
          status: this.autoCloseScheduler ? 'running' : 'stopped',
          details: 'Auto-closes resolved requests at 12:00 AM daily'
        };
      }

    } catch (error) {
      console.error('Error getting service status (system protected):', error);
      status.services.error = { status: 'error', details: 'Status check failed' };
    }

    return status;
  }

  /**
   * Manual trigger for testing (safe)
   */
  async manualTrigger(serviceName: string): Promise<any> {
    try {
      console.log(`🔧 Manual trigger for ${serviceName}...`);

      switch (serviceName) {
        case 'holidays':
          return await checkAndGenerateHolidays();

        case 'approvals':
          if (this.services.has('approvals')) {
            return await safeApprovalReminderService.sendDailyReminders();
          }
          break;

        case 'sla-monitoring':
          if (this.services.has('sla-monitoring')) {
            return await safeSLAMonitoringService.manualTriggerSLA();
          }
          break;

        case 'auto-close':
          if (this.services.has('auto-close')) {
            return await safeSLAMonitoringService.manualTriggerAutoClose();
          }
          break;

        default:
          return { success: false, error: `Unknown service: ${serviceName}` };
      }

    } catch (error) {
      console.error(`Manual trigger failed for ${serviceName} (system protected):`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }

  /**
   * Safe shutdown of all services
   */
  shutdown(): void {
    try {
      console.log('🛑 Shutting down background services...');

      // Stop holiday scheduler
      if (this.holidayScheduler) {
        clearTimeout(this.holidayScheduler);
        this.holidayScheduler = null;
        console.log('✅ Holiday scheduler stopped');
      }

      // Stop approval scheduler
      if (this.approvalScheduler) {
        clearTimeout(this.approvalScheduler);
        this.approvalScheduler = null;
        console.log('✅ Approval scheduler stopped');
      }

      // Stop SLA scheduler
      if (this.slaScheduler) {
        clearTimeout(this.slaScheduler);
        this.slaScheduler = null;
        console.log('✅ SLA scheduler stopped');
      }

      // Stop auto-close scheduler
      if (this.autoCloseScheduler) {
        clearTimeout(this.autoCloseScheduler);
        this.autoCloseScheduler = null;
        console.log('✅ Auto-close scheduler stopped');
      }

      // Stop other services
      this.services.forEach((service, name) => {
        try {
          if (service.stop) {
            service.stop();
            console.log(`✅ ${name} service stopped`);
          }
        } catch (error) {
          console.error(`Error stopping ${name} service:`, error);
        }
      });

      this.services.clear();
      this.isInitialized = false;

      console.log('✅ All background services shut down');

    } catch (error) {
      console.error('Error during shutdown (system protected):', error);
    }
  }

  /**
   * Restart a specific service safely
   */
  async restartService(serviceName: string): Promise<void> {
    try {
      console.log(`🔄 Restarting ${serviceName} service...`);

      if (serviceName === 'holidays') {
        // Stop holiday scheduler
        if (this.holidayScheduler) {
          clearTimeout(this.holidayScheduler);
          this.holidayScheduler = null;
        }
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Restart
        this.startHolidayScheduler();
        console.log('✅ Holiday service restarted');
        return;
      }

      const service = this.services.get(serviceName);
      if (service) {
        // Stop safely
        if (service.stop) {
          service.stop();
        }

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Restart safely
        if (service.start) {
          service.start();
        }

        console.log(`✅ ${serviceName} service restarted`);
      } else {
        console.log(`❌ Service ${serviceName} not found`);
      }

    } catch (error) {
      console.error(`Failed to restart ${serviceName} (system protected):`, error);
    }
  }
}

export const safeBackgroundServiceManager = SafeBackgroundServiceManager.getInstance();

// SAFE auto-initialization with delay and error protection
if (typeof window === 'undefined') { // Server-side only
  // Use a global flag to prevent multiple initializations in development
  const globalKey = '__ASPAC_BACKGROUND_SERVICES_INITIALIZED__';
  
  if (!(global as any)[globalKey]) {
    (global as any)[globalKey] = true;
    
    console.log('🔧 First-time background service initialization...');
    
    setTimeout(async () => {
      try {
        // Additional safety check to ensure services are properly instantiated
        const manager = safeBackgroundServiceManager;
        if (manager && typeof manager.initializeAllServices === 'function') {
          await manager.initializeAllServices();
        } else {
          console.error('Background service manager not properly initialized');
        }
      } catch (error) {
        console.error('Failed to initialize background services (main app protected):', error);
      }
    }, 8000); // Increased delay to ensure full application startup
  } else {
    console.log('⚡ Background services already initialized (development mode protection)');
  }
}
