import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all backup approver configurations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch backup approver configurations with related user data
    const backupConfigs = await prisma.backup_approvers.findMany({
      where: {
        is_active: true,
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
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
      },
      orderBy: {
        start_date: 'desc',
      },
    });

    // Process expired configurations first
    const now = new Date();
    // Get today's date at midnight for date-only comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiredConfigs = [];
    const validConfigs = [];

    for (const config of backupConfigs) {
      const endDate = new Date(config.end_date);
      // Get end date at midnight for date-only comparison
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // Configuration is expired if today is after the end date (next day or later)
      if (today > endDateOnly) {
        expiredConfigs.push(config);
      } else {
        validConfigs.push(config);
      }
    }

    // Auto-deactivate expired configurations
    if (expiredConfigs.length > 0) {
      await prisma.backup_approvers.updateMany({
        where: {
          id: { in: expiredConfigs.map(c => c.id) },
        },
        data: {
          is_active: false,
          deactivated_at: now,
        },
      });

      // Log the expiration for each config
      for (const config of expiredConfigs) {
        await prisma.backup_approver_logs.create({
          data: {
            backup_config_id: config.id,
            action_type: 'expired',
            details: {
              expiredAt: now,
              reason: 'Auto-deactivated due to expiration',
            },
            performed_by: null, // System action
          },
        });
      }

      console.log(`Auto-deactivated ${expiredConfigs.length} expired backup configurations`);
    }

    // Transform the valid configs to include computed fields
    const transformedConfigs = validConfigs.map(config => {
      const startDate = new Date(config.start_date);
      const endDate = new Date(config.end_date);
      
      // Get date-only versions for comparison
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      let currentStatus = 'scheduled';
      let daysRemaining = Math.ceil((startDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (today >= startDateOnly && today <= endDateOnly) {
        currentStatus = 'active';
        // For active configs, calculate inclusive days remaining (including today)
        daysRemaining = Math.ceil((endDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      // Debug logging for same-day configurations
      if (startDateOnly.getTime() === today.getTime()) {
        console.log(`Same-day config found:`, {
          id: config.id,
          startDateOnly: startDateOnly.toDateString(),
          endDateOnly: endDateOnly.toDateString(),
          today: today.toDateString(),
          currentStatus,
          daysRemaining,
          isTodayAfterStart: today >= startDateOnly,
          isTodayBeforeEnd: today <= endDateOnly
        });
      }

      return {
        ...config,
        original_approver_name: `${config.original_approver.emp_fname} ${config.original_approver.emp_lname}`,
        original_approver_email: config.original_approver.emp_email,
        backup_approver_name: `${config.backup_approver.emp_fname} ${config.backup_approver.emp_lname}`,
        backup_approver_email: config.backup_approver.emp_email,
        created_by_name: `${config.creator.emp_fname} ${config.creator.emp_lname}`,
        current_status: currentStatus,
        days_remaining: daysRemaining,
      };
    });
    
    return NextResponse.json(transformedConfigs);
  } catch (error) {
    console.error('Error fetching backup approvers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new backup approver configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
    const startDateOnly = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const inputEndDateOnly = new Date(endDate); // Original end date from user input
    const endDateOnlyInput = new Date(inputEndDateOnly.getFullYear(), inputEndDateOnly.getMonth(), inputEndDateOnly.getDate());

    // Allow same-day start and end dates
    if (endDateOnlyInput < startDateOnly) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
    }

    const now = new Date();
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (endDateOnlyInput < todayOnly) {
      return NextResponse.json({ error: 'End date cannot be in the past' }, { status: 400 });
    }

    // Check for overlapping configurations
    const overlappingConfig = await prisma.backup_approvers.findFirst({
      where: {
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

    // Create new configuration
    const newConfig = await prisma.backup_approvers.create({
      data: {
        original_approver_id: parseInt(originalApproverId),
        backup_approver_id: parseInt(backupApproverId),
        start_date: startDateObj,
        end_date: endDateObj,
        divert_pending: divertPending,
        reason: reason || null,
        created_by: parseInt(session.user.id),
      },
    });

    // Log the creation
    await prisma.backup_approver_logs.create({
      data: {
        backup_config_id: newConfig.id,
        action_type: 'created',
        details: { startDate, endDate, divertPending, reason },
        performed_by: parseInt(session.user.id),
      },
    });

    // If divertPending is true and the config is active today, divert existing pending approvals
    if (divertPending && startDateOnly <= todayOnly && endDateOnlyInput >= todayOnly) {
      await divertPendingApprovals(parseInt(originalApproverId), parseInt(backupApproverId), newConfig.id);
    }

    return NextResponse.json({ 
      message: 'Backup approver configuration created successfully',
      id: newConfig.id 
    });
  } catch (error) {
    console.error('Error creating backup approver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to divert pending approvals
async function divertPendingApprovals(originalApproverId: number, backupApproverId: number, configId: number) {
  try {
    console.log(`Diverting pending approvals from user ${originalApproverId} to user ${backupApproverId}`);

    // Get backup approver details for updating approval records
    const backupApprover = await prisma.users.findUnique({
      where: { id: backupApproverId },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
      },
    });

    if (!backupApprover) {
      throw new Error(`Backup approver with ID ${backupApproverId} not found`);
    }

    const backupApproverName = `${backupApprover.emp_fname} ${backupApprover.emp_lname}`;

    // Find all pending approval records where the original approver is assigned
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: originalApproverId,
        status: {
          in: ['pending_approval', 'for_clarification'],
        },
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

    console.log(`Found ${pendingApprovals.length} pending approvals to divert`);

    // Process each pending approval
    for (const approval of pendingApprovals) {
      // Skip if the associated request is already resolved/closed
      if (['resolved', 'closed', 'cancelled'].includes(approval.request.status)) {
        console.log(`Skipping approval ${approval.id} - request ${approval.request.id} is already ${approval.request.status}`);
        continue;
      }

      // Create diversion record
      await prisma.approval_diversions.create({
        data: {
          request_id: approval.requestId,
          original_approver_id: originalApproverId,
          backup_approver_id: backupApproverId,
          backup_config_id: configId,
          diversion_type: 'automatic',
          notes: `Approval diverted from ${approval.approverName || 'Original Approver'} to ${backupApproverName} due to backup configuration`,
        },
      });

      // Update the approval record to point to backup approver
      await prisma.requestApproval.update({
        where: { id: approval.id },
        data: {
          approverId: backupApproverId,
          approverName: backupApproverName,
          approverEmail: backupApprover.emp_email,
        },
      });

      // Add history entry for the diversion with proper Philippine time
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      await prisma.requestHistory.create({
        data: {
          requestId: approval.requestId,
          action: 'Approval Redirected',
          details: `${(approval.name || `Level ${approval.level}`).replace(/^level (\d+)/, 'Level $1')} redirected from ${approval.approverName || 'Original Approver'} to ${backupApproverName}`,
          actorId: backupApproverId,
          actorName: 'System',
          actorType: 'system',
          timestamp: philippineTime, // Use Philippine time instead of new Date()
        },
      });

      console.log(`Diverted approval ${approval.id} for request ${approval.requestId} to backup approver`);
    }

    console.log(`Successfully diverted ${pendingApprovals.length} pending approvals`);
    return { success: true, divertedCount: pendingApprovals.length };

  } catch (error) {
    console.error('Error diverting pending approvals:', error);
    throw error;
  }
}