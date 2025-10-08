import { prisma } from '@/lib/prisma';

/**
 * Background service to handle backup approver auto-reversion
 * This should be called by a cron job or scheduled task
 */
export class BackupApproverService {

  /**
   * Revert a specific backup configuration (for manual deactivation)
   * @param configId - The ID of the backup configuration to revert
   * @param reversionType - Type of reversion ('manual' or 'automatic')
   * @param performedBy - ID of user performing the reversion
   * @param notes - Additional notes for the reversion
   * @returns Number of approvals reverted
   */
  static async revertApprovalToOriginal(configId: number, reversionType: 'manual' | 'automatic' = 'manual', performedBy?: number, notes?: string): Promise<number> {
    try {
      console.log(`🔧 Starting reversion for backup config ${configId} (${reversionType})`);

      // Get the backup configuration with approver details
      const config = await prisma.backup_approvers.findUnique({
        where: { id: configId },
        include: {
          original_approver: {
            select: { id: true, emp_fname: true, emp_lname: true }
          },
          backup_approver: {
            select: { id: true, emp_fname: true, emp_lname: true }
          }
        }
      });

      if (!config) {
        console.log(`❌ Backup configuration ${configId} not found`);
        return 0;
      }

      console.log(`📋 Config found: ${config.original_approver.emp_fname} ${config.original_approver.emp_lname} → ${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname}`);

      // Find all pending diversions for this configuration
      const pendingDiversions = await prisma.approval_diversions.findMany({
        where: {
          backup_config_id: configId,
          reverted_at: null,
        },
        include: {
          request: {
            select: { id: true, status: true }
          }
        }
      });

      console.log(`🔍 Found ${pendingDiversions.length} pending diversions to revert`);

      let revertedCount = 0;

      // Process each diversion
      for (const diversion of pendingDiversions) {
        try {
          await this.revertSingleApproval(diversion, config, reversionType);
          revertedCount++;
        } catch (error) {
          console.error(`❌ Error reverting diversion ${diversion.id}:`, error);
        }
      }

      console.log(`✅ Successfully reverted ${revertedCount} approvals for config ${configId}`);
      return revertedCount;

    } catch (error) {
      console.error(`❌ Error in revertApprovalToOriginal for config ${configId}:`, error);
      throw error;
    }
  }
  
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
          await this.revertSingleApproval(diversion, config, 'automatic');
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
   * Revert a single approval back to the original approver
   * PRECISE REVERSION: Use the approval_id from diversion record to identify exactly which approval to revert
   */
  private static async revertSingleApproval(diversion: any, config: any, reversionType: 'manual' | 'automatic' = 'automatic') {
    try {
      console.log(`🔄 Reverting approval for request ${diversion.request_id} back to original approver`);
      console.log(`📋 Diversion: Original=${config.original_approver_id} (${config.original_approver.emp_fname} ${config.original_approver.emp_lname}) → Backup=${config.backup_approver_id} (${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname})`);
      console.log(`🆔 Diversion Approval ID: ${diversion.approval_id}`);

      // Get original approver details
      const originalApprover = config.original_approver;
      const originalApproverName = `${originalApprover.emp_fname} ${originalApprover.emp_lname}`;

      let targetApprovalToRevert = null;

      // PRECISE STRATEGY: Use the approval_id stored in the diversion record
      if (diversion.approval_id) {
        // New method: Find the exact approval that was diverted
        targetApprovalToRevert = await prisma.requestApproval.findUnique({
          where: {
            id: diversion.approval_id,
          },
        });

        if (targetApprovalToRevert) {
          // Verify this approval is still pending and assigned to the backup approver
          if (targetApprovalToRevert.approverId !== config.backup_approver_id) {
            console.log(`⚠️ Approval ${diversion.approval_id} is not currently assigned to backup approver (current: ${targetApprovalToRevert.approverId}, expected: ${config.backup_approver_id})`);
            targetApprovalToRevert = null;
          } else if (!['pending_approval', 'for_clarification'].includes(targetApprovalToRevert.status)) {
            console.log(`⚠️ Approval ${diversion.approval_id} is not in pending status (current: ${targetApprovalToRevert.status})`);
            return; // Don't revert already processed approvals
          } else {
            console.log(`✅ Found exact approval to revert: ${targetApprovalToRevert.id} (Level ${targetApprovalToRevert.level})`);
          }
        } else {
          console.log(`⚠️ Approval ${diversion.approval_id} not found - may have been deleted`);
        }
      }

      // FALLBACK STRATEGY: If approval_id is not available (old diversions), use previous logic
      if (!targetApprovalToRevert) {
        console.log(`🔍 Falling back to pattern-based detection for diversion without approval_id`);
        
        const allApprovals = await prisma.requestApproval.findMany({
          where: {
            requestId: diversion.request_id,
            status: {
              in: ['pending_approval', 'for_clarification'],
            },
          },
          orderBy: {
            level: 'asc',
          },
        });

        const backupApproverApprovals = allApprovals.filter(a => a.approverId === config.backup_approver_id);
        console.log(`🔍 Found ${backupApproverApprovals.length} pending approvals assigned to backup approver`);
        
        // Use time-based matching as fallback
        if (backupApproverApprovals.length > 0) {
          const diversionTime = new Date(diversion.diverted_at);
          const timeBuffer = 10 * 60 * 1000; // 10 minutes buffer
          
          const timeBoundApprovals = backupApproverApprovals.filter(approval => {
            const approvalTime = new Date(approval.createdAt);
            return Math.abs(approvalTime.getTime() - diversionTime.getTime()) <= timeBuffer;
          });
          
          if (timeBoundApprovals.length > 0) {
            targetApprovalToRevert = timeBoundApprovals[0];
            console.log(`🎯 Fallback: Using time-based match - approval ${targetApprovalToRevert.id} (Level ${targetApprovalToRevert.level})`);
          } else {
            // Last resort: take the first approval for backup approver
            targetApprovalToRevert = backupApproverApprovals[0];
            console.log(`🎯 Last resort: Using first backup approval ${targetApprovalToRevert.id} (Level ${targetApprovalToRevert.level})`);
          }
        }
      }

      if (!targetApprovalToRevert) {
        console.log(`❌ No suitable approval found for reversion`);
        return;
      }

      // Perform the reversion
      console.log(`🔄 Reverting approval ${targetApprovalToRevert.id} (Level ${targetApprovalToRevert.level}) back to original approver ${config.original_approver_id}`);
      
      await prisma.requestApproval.update({
        where: { id: targetApprovalToRevert.id },
        data: {
          approverId: config.original_approver_id,
          approverName: originalApproverName,
          approverEmail: originalApprover.emp_email,
        },
      });
      
      console.log(`✅ Successfully reverted approval ${targetApprovalToRevert.id} (Level ${targetApprovalToRevert.level}) back to ${originalApproverName}`);


      // For manual reversions, delete the diversion record to prevent duplicate processing
      // For automatic reversions, update to mark as reverted
      if (reversionType === 'manual') {
        await prisma.approval_diversions.delete({
          where: { id: diversion.id },
        });
        console.log(`🗑️ Deleted diversion record ${diversion.id} (manual deactivation)`);
      } else {
        await prisma.approval_diversions.update({
          where: { id: diversion.id },
          data: {
            reverted_at: new Date(),
            reversion_type: 'expired',
            notes: 'Automatically reverted after backup period ended',
          },
        });
        console.log(`📝 Updated diversion record ${diversion.id} (automatic reversion)`);
      }

      // Add a history entry about the reversion with Philippine time
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      const historyAction = reversionType === 'manual' ? 'Backup Approver Deactivated' : 'Approval Reverted';
      const historyDetails = reversionType === 'manual' 
        ? `Backup approver configuration manually deactivated. Approval reverted from backup approver ${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname} back to original approver ${originalApproverName}.\nReason: Manual deactivation`
        : `Backup approver period expired. Approval automatically reverted from backup approver ${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname} back to original approver ${originalApproverName}.\nReason: Backup period ended`;
      
      await prisma.requestHistory.create({
        data: {
          requestId: diversion.request_id,
          action: historyAction,
          details: historyDetails,
          actorId: config.original_approver_id,
          actorName: reversionType === 'manual' ? 'System (Manual Deactivation)' : 'System',
          actorType: 'system',
          timestamp: philippineTime,
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