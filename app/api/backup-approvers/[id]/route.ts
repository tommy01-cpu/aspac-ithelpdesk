import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: Update backup approver configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = parseInt(params.id);
    if (!configId) {
      return NextResponse.json({ error: 'Invalid configuration ID' }, { status: 400 });
    }

    const body = await request.json();

    // Find the existing configuration
    const existingConfig = await prisma.backup_approvers.findUnique({
      where: { id: configId },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // If only updating is_active (deactivation/activation)
    if (body.hasOwnProperty('is_active') && Object.keys(body).length === 1) {
      const { is_active } = body;

      const updatedConfig = await prisma.backup_approvers.update({
        where: { id: configId },
        data: {
          is_active: is_active,
          deactivated_at: is_active === false ? new Date() : null,
          deactivated_by: is_active === false ? parseInt(session.user.id) : null,
          updated_at: new Date(),
        },
      });

      // If deactivating, revert any pending diversions first and get the count
      let revertedCount = 0;
      if (is_active === false) {
        revertedCount = await revertPendingDiversions(configId, parseInt(session.user.id));
      }

      // Log the action with proper details
      const actionType = is_active === false ? 'deactivated' : 'activated';
      await prisma.backup_approver_logs.create({
        data: {
          backup_config_id: configId,
          action_type: actionType,
          details: { 
            is_active, 
            previousState: existingConfig.is_active,
            revertedDiversions: is_active === false ? revertedCount : undefined,
            reason: is_active === false ? 'Configuration manually deactivated' : 'Configuration manually activated'
          },
          performed_by: parseInt(session.user.id),
        },
      });

      return NextResponse.json({ 
        message: `Backup approver configuration ${actionType} successfully`,
        config: updatedConfig
      });
    }

    // Full configuration update
    const {
      originalApproverId,
      backupApproverId,
      startDate,
      endDate,
      divertPending,
      reason
    } = body;

    // Validation
    if (!originalApproverId || !backupApproverId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (originalApproverId === backupApproverId) {
      return NextResponse.json({ error: 'Original and backup approver cannot be the same' }, { status: 400 });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    // Set end time to end of day (23:59:59) to ensure backup is active through the entire "To" date
    endDateObj.setHours(23, 59, 59, 999);

    // Compare dates only (not time) for validation
    const startDateOnly = new Date(startDateObj);
    startDateOnly.setHours(0, 0, 0, 0);
    const inputEndDateOnly = new Date(endDate);
    inputEndDateOnly.setHours(0, 0, 0, 0);

    if (inputEndDateOnly < startDateOnly) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputEndDateOnly < today) {
      return NextResponse.json({ error: 'End date cannot be in the past' }, { status: 400 });
    }

    // Check for overlapping configurations (excluding current config)
    const overlappingConfig = await prisma.backup_approvers.findFirst({
      where: {
        id: { not: configId }, // Exclude current configuration
        original_approver_id: parseInt(originalApproverId),
        is_active: true,
        OR: [
          {
            AND: [
              { start_date: { lte: startDateObj } },
              { end_date: { gte: startDateObj } },
            ],
          },
          {
            AND: [
              { start_date: { lte: endDateObj } },
              { end_date: { gte: endDateObj } },
            ],
          },
          {
            AND: [
              { start_date: { gte: startDateObj } },
              { end_date: { lte: endDateObj } },
            ],
          },
        ],
      },
    });

    if (overlappingConfig) {
      const startDateStr = new Date(overlappingConfig.start_date).toLocaleDateString();
      const endDateStr = new Date(overlappingConfig.end_date).toLocaleDateString();
      return NextResponse.json({ 
        error: `A backup approver configuration already exists for this approver from ${startDateStr} to ${endDateStr}. Please choose different dates or end the existing configuration first.` 
      }, { status: 400 });
    }

    // Update the configuration
    const philippineTimeUpdate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    const updatedConfig = await prisma.backup_approvers.update({
      where: { id: configId },
      data: {
        original_approver_id: parseInt(originalApproverId),
        backup_approver_id: parseInt(backupApproverId),
        start_date: startDateObj,
        end_date: endDateObj,
        divert_pending: divertPending,
        reason: reason || null,
        updated_at: philippineTimeUpdate,
      },
    });

    // Log the update
    await prisma.backup_approver_logs.create({
      data: {
        backup_config_id: configId,
        action_type: 'updated',
        details: { 
          previousConfig: {
            original_approver_id: existingConfig.original_approver_id,
            backup_approver_id: existingConfig.backup_approver_id,
            start_date: existingConfig.start_date,
            end_date: existingConfig.end_date,
            divert_pending: existingConfig.divert_pending,
            reason: existingConfig.reason,
          },
          newConfig: { startDate, endDate, divertPending, reason }
        },
        performed_by: parseInt(session.user.id),
      },
    });

    return NextResponse.json({ 
      message: 'Backup approver configuration updated successfully',
      id: updatedConfig.id 
    });
  } catch (error) {
    console.error('Error updating backup approver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove backup approver configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = parseInt(params.id);
    if (!configId) {
      return NextResponse.json({ error: 'Invalid configuration ID' }, { status: 400 });
    }

    // Find the existing configuration
    const existingConfig = await prisma.backup_approvers.findUnique({
      where: { id: configId },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Revert any pending diversions first
    await revertPendingDiversions(configId, parseInt(session.user.id));

    // Delete the configuration (this will cascade to logs and diversions due to foreign key constraints)
    await prisma.backup_approvers.delete({
      where: { id: configId },
    });

    return NextResponse.json({ 
      message: 'Backup approver configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup approver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to revert pending diversions
async function revertPendingDiversions(configId: number, performedBy: number): Promise<number> {
  try {
    // Get the backup configuration details first
    const backupConfig = await prisma.backup_approvers.findUnique({
      where: { id: configId },
    });

    if (!backupConfig) {
      console.error('Backup configuration not found for reversion');
      return 0;
    }

    // Find all pending diversions for this configuration
    const pendingDiversions = await prisma.approval_diversions.findMany({
      where: {
        backup_config_id: configId,
        reverted_at: null,
      },
    });

    let revertedCount = 0;

    // Revert each diversion
    for (const diversion of pendingDiversions) {
      try {
        // Create Philippine time timestamp for reversion
        const philippineReversionTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
        
        // Update the diversion record as reverted
        await prisma.approval_diversions.update({
          where: { id: diversion.id },
          data: {
            reverted_at: philippineReversionTime,
            reversion_type: 'manual',
            notes: 'Backup approver configuration deactivated'
          },
        });

        // Update the requestApproval to point back to original approver
        const updated = await prisma.requestApproval.updateMany({
          where: {
            requestId: diversion.request_id,
            approverId: diversion.backup_approver_id,
            status: {
              in: ['pending_approval', 'for_clarification']
            }
          },
          data: {
            approverId: diversion.original_approver_id,
          },
        });

        if (updated.count > 0) {
          // Get approver names for history entry
          const [originalApprover, backupApprover] = await Promise.all([
            prisma.users.findUnique({
              where: { id: diversion.original_approver_id },
              select: { emp_fname: true, emp_lname: true }
            }),
            prisma.users.findUnique({
              where: { id: diversion.backup_approver_id },
              select: { emp_fname: true, emp_lname: true }
            })
          ]);

          const originalApproverName = originalApprover ? `${originalApprover.emp_fname} ${originalApprover.emp_lname}` : 'Original Approver';
          const backupApproverName = backupApprover ? `${backupApprover.emp_fname} ${backupApprover.emp_lname}` : 'Backup Approver';

          // Add request history entry for the reversion (same format as automatic service)
          // Use Philippine time (UTC+8) like the routing service
          const now = new Date();
          const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
          
          await prisma.requestHistory.create({
            data: {
              requestId: diversion.request_id,
              action: 'Approval Reverted',
              details: `Approval manually reverted from backup approver ${backupApproverName} back to original approver ${originalApproverName} (configuration deactivated)`,
              actorId: performedBy,
              actorName: 'Manual Deactivation',
              actorType: 'user',
              timestamp: philippineTime,
            },
          });

          revertedCount++;
        }
      } catch (error) {
        console.error(`Error reverting diversion ${diversion.id}:`, error);
      }
    }

    console.log(`Successfully reverted ${revertedCount} pending approvals back to original approver`);
    return revertedCount;
  } catch (error) {
    console.error('Error reverting pending diversions:', error);
    return 0;
  }
}