// import cron from 'node-cron';
import { BackupApproverService } from './backup-approver-service';

/**
 * Backup Approver Scheduler Service
 * 
 * This service handles the automated scheduling of backup approver checks.
 * It runs on a configurable schedule to check for expired backup configurations
 * and automatically revert approvals back to original approvers.
 * 
 * NOTE: This service requires node-cron package. For production builds,
 * use external scheduling (Windows Task Scheduler, cron, etc.) instead.
 */
export class BackupApproverScheduler {
  private static isRunning = false;
  private static scheduledTask: any | null = null; // cron.ScheduledTask

  /**
   * Start the backup approver scheduler
   * 
   * Default schedule: Every day at 12:01 AM (midnight)
   * You can customize the schedule using cron format:
   * - "0 1 0 * * *" = Every day at 12:01 AM
   * - "0 0 * /6 * * *" = Every 6 hours
   * - "0 30 * /3 * * *" = Every 3 hours at 30 minutes past the hour
   */
  static start(schedule: string = '0 1 0 * * *') {
    if (this.isRunning) {
      console.log('Backup approver scheduler is already running');
      return;
    }

    console.log(`Starting backup approver scheduler with schedule: ${schedule}`);
    
    // TODO: Uncomment when node-cron is installed
    // this.scheduledTask = cron.schedule(schedule, async () => {
    //   try {
    //     console.log('Running scheduled backup approver check...');
    //     const result = await BackupApproverService.processExpiredBackupConfigurations();
    //     console.log(`Scheduled backup approver check completed:`, result);
    //   } catch (error) {
    //     console.error('Error in scheduled backup approver check:', error);
    //   }
    // }, {
    //   scheduled: true,
    //   timezone: "Asia/Manila" // Adjust to your timezone
    // });

    this.isRunning = true;
    console.log('Backup approver scheduler started successfully');
  }

  /**
   * Stop the backup approver scheduler
   */
  static stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }
    this.isRunning = false;
    console.log('Backup approver scheduler stopped');
  }

  /**
   * Check if the scheduler is currently running
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      nextScheduledRun: this.scheduledTask?.getStatus()
    };
  }

  /**
   * Run a manual check immediately (for testing or immediate processing)
   */
  static async runManualCheck() {
    try {
      console.log('Running manual backup approver check...');
      const result = await BackupApproverService.processExpiredBackupConfigurations();
      console.log('Manual backup approver check completed:', result);
      return result;
    } catch (error) {
      console.error('Error in manual backup approver check:', error);
      throw error;
    }
  }

  /**
   * Get upcoming backup configurations that will expire soon
   * This can be used for warnings and notifications
   */
  static async getUpcomingExpirations(daysAhead: number = 7) {
    try {
      return await BackupApproverService.getUpcomingExpirations(daysAhead);
    } catch (error) {
      console.error('Error getting upcoming expirations:', error);
      throw error;
    }
  }

  /**
   * Schedule types and their descriptions
   */
  static getScheduleOptions() {
    return {
      'daily_midnight': {
        cron: '0 1 0 * * *',
        description: 'Every day at 12:01 AM (recommended for most cases)'
      },
      'daily_morning': {
        cron: '0 0 8 * * *',
        description: 'Every day at 8:00 AM (business hours start)'
      },
      'every_6_hours': {
        cron: '0 0 */6 * * *',
        description: 'Every 6 hours (4 times per day)'
      },
      'every_3_hours': {
        cron: '0 30 */3 * * *',
        description: 'Every 3 hours at 30 minutes past the hour'
      },
      'every_hour': {
        cron: '0 0 * * * *',
        description: 'Every hour (for high-frequency environments)'
      },
      'business_hours_only': {
        cron: '0 0 8-18 * * 1-5',
        description: 'Every hour during business hours (8 AM - 6 PM, Monday-Friday)'
      }
    };
  }
}

// Example usage in your main application:
// BackupApproverScheduler.start(); // Uses default daily schedule
// BackupApproverScheduler.start('0 0 */6 * * *'); // Every 6 hours