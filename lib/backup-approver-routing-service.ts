import { prisma } from '@/lib/prisma';
import { ApprovalStatus } from '@prisma/client';

/**
 * Service to handle routing approvals to backup approvers when active configurations exist
 * Updated to allow backup approvers in multiple levels (validation removed)
 */
export class BackupApproverRoutingService {

  /**
   * Check if there's an active backup approver configuration for the given approver
   * and return the backup approver details if found
   */
  static async getActiveBackupApprover(originalApproverId: number): Promise<{
    shouldRoute: boolean;
    backupApprover?: {
      id: number;
      name: string;
      email: string;
    };
    configId?: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999); // End of day

      // Find active backup configuration for this approver
      const activeConfig = await prisma.backup_approvers.findFirst({
        where: {
          original_approver_id: originalApproverId,
          is_active: true,
          start_date: {
            lte: endOfDay,
          },
          end_date: {
            gte: today,
          },
        },
        include: {
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

      if (activeConfig && activeConfig.backup_approver) {
        return {
          shouldRoute: true,
          backupApprover: {
            id: activeConfig.backup_approver.id,
            name: `${activeConfig.backup_approver.emp_fname} ${activeConfig.backup_approver.emp_lname}`,
            email: activeConfig.backup_approver.emp_email || '',
          },
          configId: activeConfig.id,
        };
      }

      return { shouldRoute: false };

    } catch (error) {
      console.error('Error checking for active backup approver:', error);
      return { shouldRoute: false };
    }
  }

  /**
   * Route approval to backup approver and create diversion record
   */
  static async routeApprovalToBackup(
    requestId: number,
    originalApproverId: number,
    approvalData: {
      level: number;
      name: string;
      approverId: number;
      approverName: string;
      approverEmail: string;
      sentOn?: Date;
      createdAt: Date;
      status?: ApprovalStatus;
    }
  ): Promise<{
    success: boolean;
    routedTo?: {
      id: number;
      name: string;
      email: string;
    };
    configId?: number;
  }> {
    try {
      // Check for active backup configuration
      const backupConfig = await this.getActiveBackupApprover(originalApproverId);

      if (!backupConfig.shouldRoute || !backupConfig.backupApprover) {
        // No backup configuration, return original approval data
        return { success: true };
      }

      console.log(`Routing approval for request ${requestId} from user ${originalApproverId} to backup approver ${backupConfig.backupApprover.id}`);

      // Create the approval record with backup approver details
      const approvalRecord = await prisma.requestApproval.create({
        data: {
          requestId: requestId,
          ...approvalData,
          approverId: backupConfig.backupApprover.id,
          approverName: backupConfig.backupApprover.name,
          approverEmail: backupConfig.backupApprover.email,
        },
      });

      // Create diversion record linked to the specific approval
      await prisma.approval_diversions.create({
        data: {
          request_id: requestId,
          original_approver_id: originalApproverId,
          backup_approver_id: backupConfig.backupApprover.id,
          approval_id: approvalRecord.id, // Link to the specific approval that was diverted
          backup_config_id: backupConfig.configId!,
          diversion_type: 'automatic',
          notes: `New approval automatically routed to backup approver due to active backup configuration`,
        },
      });

      // Add history entry with the same timestamp as the approval creation but in Philippine time
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      await prisma.requestHistory.create({
        data: {
          requestId: requestId,
          action: 'Approval Redirected',
          details: `${approvalData.name} redirected from original approver to ${backupConfig.backupApprover.name}`,
          actorId: backupConfig.backupApprover.id,
          actorName: 'System',
          actorType: 'system',
          timestamp: philippineTime, // Use Philippine time instead of approval createdAt
        },
      });

      console.log(`Successfully routed approval for request ${requestId} to backup approver`);

      return {
        success: true,
        routedTo: backupConfig.backupApprover,
        configId: backupConfig.configId,
      };

    } catch (error) {
      console.error('Error routing approval to backup approver:', error);
      throw error;
    }
  }

  /**
   * Get approval data with backup routing applied
   * Use this when creating new approvals to automatically route to backup approvers
   */
  static async getRoutedApprovalData(
    originalApproverId: number,
    originalApprovalData: {
      level: number;
      name: string;
      approverId: number;
      approverName: string;
      approverEmail: string;
      sentOn?: Date;
      createdAt: Date;
      status?: string;
    }
  ): Promise<{
    approvalData: {
      level: number;
      name: string;
      approverId: number;
      approverName: string;
      approverEmail: string;
      sentOn?: Date;
      createdAt: Date;
      status?: string;
    };
    isRouted: boolean;
    routingInfo?: {
      originalApproverId: number;
      backupApproverId: number;
      configId: number;
    };
  }> {
    try {
      const backupConfig = await this.getActiveBackupApprover(originalApproverId);

      if (!backupConfig.shouldRoute || !backupConfig.backupApprover) {
        // No routing needed
        return {
          approvalData: originalApprovalData,
          isRouted: false,
        };
      }

      // Route to backup approver
      return {
        approvalData: {
          ...originalApprovalData,
          approverId: backupConfig.backupApprover.id,
          approverName: backupConfig.backupApprover.name,
          approverEmail: backupConfig.backupApprover.email,
        },
        isRouted: true,
        routingInfo: {
          originalApproverId,
          backupApproverId: backupConfig.backupApprover.id,
          configId: backupConfig.configId!,
        },
      };

    } catch (error) {
      console.error('Error getting routed approval data:', error);
      // Return original data on error to prevent blocking approval creation
      return {
        approvalData: originalApprovalData,
        isRouted: false,
      };
    }
  }

  /**
   * Create diversion record for routed approval (call this after creating the approval)
   */
  static async createDiversionRecord(
    requestId: number,
    routingInfo: {
      originalApproverId: number;
      backupApproverId: number;
      configId: number;
    }
  ): Promise<void> {
    try {
      await prisma.approval_diversions.create({
        data: {
          request_id: requestId,
          original_approver_id: routingInfo.originalApproverId,
          backup_approver_id: routingInfo.backupApproverId,
          backup_config_id: routingInfo.configId,
          diversion_type: 'automatic',
          notes: 'New approval automatically routed to backup approver due to active backup configuration',
        },
      });

      // Add history entry
      const backupApprover = await prisma.users.findUnique({
        where: { id: routingInfo.backupApproverId },
        select: { emp_fname: true, emp_lname: true },
      });

      if (backupApprover) {
        const backupApproverName = `${backupApprover.emp_fname} ${backupApprover.emp_lname}`;
        
        // Create Philippine time for consistent timestamp formatting
        const now = new Date();
        const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        
        await prisma.requestHistory.create({
          data: {
            requestId: requestId,
            action: 'Approval Redirected',
            details: `Approval redirected to ${backupApproverName}`,
            actorId: routingInfo.backupApproverId,
            actorName: 'System',
            actorType: 'system',
            timestamp: philippineTime, // Use Philippine time instead of new Date()
          },
        });
      }

    } catch (error) {
      console.error('Error creating diversion record:', error);
      // Don't throw error here to prevent blocking the main approval flow
    }
  }
}