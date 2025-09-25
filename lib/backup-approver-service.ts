import { prisma } from '@/lib/prisma';

/**
 * Background service to handle backup approver auto-reversion
 * This should be called by a cron job or scheduled task
 */
export class BackupApproverService {
  
  /**
   * Process expired backup approver configurations and revert pending approvals
   */
  static async processExpiredBackupConfigurations() {
    try {
      console.log('Starting backup approver auto-reversion process...');
      
      const now = new Date();
      
      // Find all active backup configurations that have expired
      const expiredConfigs = await prisma.backup_approvers.findMany({
        where: {
          is_active: true,
          end_date: {
            lt: now, // end_date is less than current time
          },
        },
        include: {
          original_approver: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
          backup_approver: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
        },
      });

      console.log(`Found ${expiredConfigs.length} expired backup configurations`);

      for (const config of expiredConfigs) {
        await this.revertExpiredConfiguration(config);
      }

      console.log('Backup approver auto-reversion process completed');
      return {
        processedConfigs: expiredConfigs.length,
        timestamp: now,
      };
    } catch (error) {
      console.error('Error in backup approver auto-reversion process:', error);
      throw error;
    }
  }

  /**
   * Revert a specific expired backup configuration
   */
  private static async revertExpiredConfiguration(config: any) {
    try {
      console.log(`Processing expired config ID: ${config.id} (${config.original_approver.emp_fname} ${config.original_approver.emp_lname} -> ${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname})`);

      // Find all pending diversions for this configuration that haven't been reverted
      const pendingDiversions = await prisma.approval_diversions.findMany({
        where: {
          backup_config_id: config.id,
          reverted_at: null,
        },
        include: {
          request: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      console.log(`Found ${pendingDiversions.length} pending diversions for config ${config.id}`);

      let revertedCount = 0;
      let alreadyApprovedCount = 0;

      // Process each pending diversion
      for (const diversion of pendingDiversions) {
        // Check if the request is still pending approval
        const currentRequest = await prisma.request.findUnique({
          where: { id: diversion.request_id },
          select: {
            id: true,
            status: true,
          },
        });

        if (!currentRequest) {
          console.log(`Request ${diversion.request_id} no longer exists, skipping...`);
          continue;
        }

        // Only revert if the request is still pending approval
        if (this.isRequestStillPendingApproval(currentRequest)) {
          // Revert the approval back to original approver
          await this.revertApprovalToOriginal(diversion, config);
          revertedCount++;
        } else {
          // Mark the diversion as completed (already approved/rejected)
          await prisma.approval_diversions.update({
            where: { id: diversion.id },
            data: {
              reverted_at: new Date(),
              reversion_type: 'expired',
              notes: 'Request was already processed during backup period',
            },
          });
          alreadyApprovedCount++;
        }
      }

      // Deactivate the expired configuration
      await prisma.backup_approvers.update({
        where: { id: config.id },
        data: {
          is_active: false,
          deactivated_at: new Date(),
          deactivated_by: null, // System deactivation
        },
      });

      // Log the expiration
      await prisma.backup_approver_logs.create({
        data: {
          backup_config_id: config.id,
          action_type: 'expired',
          details: {
            revertedApprovals: revertedCount,
            alreadyProcessed: alreadyApprovedCount,
            totalDiversions: pendingDiversions.length,
            expiredAt: new Date(),
          },
          performed_by: null, // System action
        },
      });

      console.log(`Config ${config.id} processed: ${revertedCount} reverted, ${alreadyApprovedCount} already processed`);

      // Send notification about the reversion if there were pending approvals
      if (revertedCount > 0) {
        await this.sendReversionNotification(config, revertedCount);
      }

    } catch (error) {
      console.error(`Error processing expired config ${config.id}:`, error);
      
      // Log the error
      await prisma.backup_approver_logs.create({
        data: {
          backup_config_id: config.id,
          action_type: 'expired',
          details: {
            error: (error as Error).message,
            failedAt: new Date(),
          },
          performed_by: null,
        },
      });
    }
  }

  /**
   * Check if a request is still pending approval
   */
  private static isRequestStillPendingApproval(request: any): boolean {
    // Define what constitutes a pending approval state
    const pendingStatuses = ['open', 'for_approval', 'pending_approval'];
    const finalizedStatuses = ['resolved', 'closed', 'cancelled', 'rejected'];
    
    return (
      !finalizedStatuses.includes(request.status) &&
      pendingStatuses.includes(request.status)
    );
  }

  /**
   * Revert an approval back to the original approver
   */
  private static async revertApprovalToOriginal(diversion: any, config: any) {
    try {
      console.log(`Reverting approval for request ${diversion.request_id} back to original approver`);

      // Get original approver details
      const originalApprover = config.original_approver;
      const originalApproverName = `${originalApprover.emp_fname} ${originalApprover.emp_lname}`;

      // Find the approval record that was diverted
      const approvalRecord = await prisma.requestApproval.findFirst({
        where: {
          requestId: diversion.request_id,
          approverId: config.backup_approver_id, // Currently assigned to backup approver
          status: {
            in: ['pending_approval', 'for_clarification'],
          },
        },
      });

      if (approvalRecord) {
        // Update the approval record back to original approver
        await prisma.requestApproval.update({
          where: { id: approvalRecord.id },
          data: {
            approverId: config.original_approver_id,
            approverName: originalApproverName,
            approverEmail: originalApprover.emp_email,
          },
        });

        console.log(`Updated approval record ${approvalRecord.id} back to original approver`);
      } else {
        console.log(`No pending approval record found for request ${diversion.request_id} - may have already been processed`);
      }

      // Update the diversion record
      await prisma.approval_diversions.update({
        where: { id: diversion.id },
        data: {
          reverted_at: new Date(),
          reversion_type: 'expired',
          notes: 'Automatically reverted after backup period ended',
        },
      });

      // Add a history entry about the reversion
      await prisma.requestHistory.create({
        data: {
          requestId: diversion.request_id,
          action: 'Approval Reverted',
          details: `Approval automatically reverted from backup approver ${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname} back to original approver ${originalApproverName} after backup period ended\nLevel : Level ${diversion.approval?.level || 'Unknown'}`,
          actorId: config.original_approver_id,
          actorName: 'System',
          actorType: 'system',
          timestamp: new Date(),
        },
      });

      console.log(`Successfully reverted request ${diversion.request_id} from backup to original approver`);
    } catch (error) {
      console.error(`Error reverting request ${diversion.request_id}:`, error);
      throw error;
    }
  }

  /**
   * Send notification about approval reversion
   */
  private static async sendReversionNotification(config: any, revertedCount: number) {
    try {
      // Create notification for original approver
      await prisma.notification.create({
        data: {
          userId: config.original_approver_id,
          type: 'APPROVAL_REVERTED',
          title: 'Approvals Reverted Back to You',
          message: `${revertedCount} pending approval(s) have been automatically reverted back to you after the backup approver period ended.`,
          data: {
            backupConfigId: config.id,
            backupApproverName: `${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname}`,
            revertedCount,
            endDate: config.end_date,
          },
          isRead: false,
        },
      });

      // Create notification for backup approver
      await prisma.notification.create({
        data: {
          userId: config.backup_approver_id,
          type: 'BACKUP_PERIOD_ENDED',
          title: 'Backup Approver Period Ended',
          message: `Your backup approver period has ended. ${revertedCount} pending approval(s) have been reverted back to ${config.original_approver.emp_fname} ${config.original_approver.emp_lname}.`,
          data: {
            backupConfigId: config.id,
            originalApproverName: `${config.original_approver.emp_fname} ${config.original_approver.emp_lname}`,
            revertedCount,
            endDate: config.end_date,
          },
          isRead: false,
        },
      });

      console.log(`Sent reversion notifications for config ${config.id}`);
    } catch (error) {
      console.error(`Error sending reversion notifications for config ${config.id}:`, error);
    }
  }

  /**
   * Get summary of upcoming expirations (useful for warnings)
   */
  static async getUpcomingExpirations(daysAhead: number = 7) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const upcomingExpirations = await prisma.backup_approvers.findMany({
        where: {
          is_active: true,
          end_date: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        include: {
          original_approver: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
          backup_approver: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
        },
        orderBy: {
          end_date: 'asc',
        },
      });

      return upcomingExpirations;
    } catch (error) {
      console.error('Error fetching upcoming expirations:', error);
      throw error;
    }
  }
}