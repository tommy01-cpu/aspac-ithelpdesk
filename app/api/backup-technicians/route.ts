import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get all backup technician configurations with details
    const configs = await (prisma as any).backup_technicians.findMany({
      include: {
        original_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        },
        backup_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform data to match the expected format
    const transformedConfigs = configs.map(config => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      
      const startDate = new Date(config.start_date);
      startDate.setHours(0, 0, 0, 0); // Set to start of day
      
      const endDate = new Date(config.end_date);
      endDate.setHours(23, 59, 59, 999); // Set to end of day to include the entire end date
      
      let currentStatus = 'unknown';
      let daysRemaining = 0;
      
      if (!config.is_active) {
        // If manually deactivated, it's expired regardless of dates
        currentStatus = 'expired';
        daysRemaining = 0;
      } else if (today < startDate) {
        currentStatus = 'scheduled';
        daysRemaining = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      } else if (today >= startDate && today <= endDate) {
        currentStatus = 'active';
        // Calculate days remaining until end of day on end_date
        const endOfEndDate = new Date(config.end_date);
        endOfEndDate.setHours(23, 59, 59, 999);
        daysRemaining = Math.max(0, Math.ceil((endOfEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (today > endDate) {
        currentStatus = 'expired';
        daysRemaining = 0;
      }

      return {
        id: config.id,
        original_technician_id: config.original_technician_id,
        backup_technician_id: config.backup_technician_id,
        start_date: config.start_date,
        end_date: config.end_date,
        is_active: config.is_active,
        divert_existing: config.divert_existing,
        reason: config.reason,
        created_at: config.created_at,
        updated_at: config.updated_at,
        original_technician_name: `${config.original_technician.emp_fname} ${config.original_technician.emp_lname}`,
        original_technician_email: config.original_technician.emp_email,
        backup_technician_name: `${config.backup_technician.emp_fname} ${config.backup_technician.emp_lname}`,
        backup_technician_email: config.backup_technician.emp_email,
        created_by_name: config.creator ? `${config.creator.emp_fname} ${config.creator.emp_lname}` : null,
        current_status: currentStatus,
        days_remaining: daysRemaining
      };
    });

    return NextResponse.json(transformedConfigs);
  } catch (error) {
    console.error('Error fetching backup technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backup technician configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      originalTechnicianId,
      backupTechnicianId,
      startDate,
      endDate,
      divertExisting = false,
      reason
    } = body;

    // Convert string IDs to integers
    const originalTechId = parseInt(originalTechnicianId);
    const backupTechId = parseInt(backupTechnicianId);

    // Validation
    if (!originalTechId || !backupTechId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: originalTechnicianId, backupTechnicianId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    if (originalTechId === backupTechId) {
      return NextResponse.json(
        { error: 'Original technician and backup technician cannot be the same person' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set times to handle same-day configurations properly
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Allow end date to be today or in the future
    if (end < todayStart) {
      return NextResponse.json(
        { error: 'End date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check for overlapping configurations
    const overlapping = await (prisma as any).backup_technicians.findFirst({
      where: {
        original_technician_id: originalTechId,
        is_active: true,
        OR: [
          {
            AND: [
              { start_date: { lte: start } },
              { end_date: { gte: start } }
            ]
          },
          {
            AND: [
              { start_date: { lte: end } },
              { end_date: { gte: end } }
            ]
          },
          {
            AND: [
              { start_date: { gte: start } },
              { end_date: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'A backup technician configuration already exists for this technician during the specified period' },
        { status: 400 }
      );
    }

    let transferredCount = 0;
    
    try {
      // Use Prisma transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the backup technician configuration
        const config = await (tx as any).backup_technicians.create({
          data: {
            original_technician_id: originalTechId,
            backup_technician_id: backupTechId,
            start_date: start,
            end_date: end,
            divert_existing: divertExisting,
            reason: reason || null,
            created_by: parseInt(session.user.id)
          }
        });

        console.log(`🔍 DEBUG: divertExisting=${divertExisting}, start=${start.toISOString()}, today=${today.toISOString()}`);
        console.log(`🔍 DEBUG: Should transfer? ${divertExisting && start <= today}`);
        
        // If divertExisting is true and the period has started, transfer existing requests
        // Check if we're currently in the active period (today falls within start and end dates)
        const now = new Date();
        const isCurrentlyActive = now >= start && now <= end;
        
        console.log(`🔍 DEBUG: Checking if should divert existing - divertExisting: ${divertExisting}, isCurrentlyActive: ${isCurrentlyActive}`);
        console.log(`🔍 DEBUG: Period: ${start.toISOString()} to ${end.toISOString()}, Now: ${now.toISOString()}`);
        
        if (divertExisting && isCurrentlyActive) {
          console.log(`🔍 DEBUG: Looking for requests assigned to originalTechId: ${originalTechId} (as string: "${originalTechId.toString()}")`);
          
          // Debug: Check all open requests to see what's available
          const allOpenRequests = await tx.request.findMany({
            where: {
              status: { in: ['open', 'on_hold'] }
            },
            select: { id: true, formData: true }
          });
          console.log(`🔍 DEBUG: Total open/on_hold requests: ${allOpenRequests.length}`);
          allOpenRequests.forEach(req => {
            const assignedId = (req.formData as any)?.assignedTechnicianId;
            console.log(`🔍 DEBUG: Request ${req.id} - assignedTechnicianId: ${assignedId} (type: ${typeof assignedId})`);
          });
          
          // Get requests to transfer - find by assignedTechnicianId in formData, NOT userId
          // Try multiple query approaches since assignedTechnicianId might be stored as string or number
          const requestsToTransferStr = await tx.request.findMany({
            where: {
              status: { in: ['open', 'on_hold'] },
              formData: {
                path: ['assignedTechnicianId'],
                equals: originalTechId.toString()
              }
            },
            select: { id: true, formData: true }
          });
          
          const requestsToTransferNum = await tx.request.findMany({
            where: {
              status: { in: ['open', 'on_hold'] },
              formData: {
                path: ['assignedTechnicianId'],
                equals: originalTechId
              }
            },
            select: { id: true, formData: true }
          });
          
          console.log(`🔍 DEBUG: String match found: ${requestsToTransferStr.length}, Number match found: ${requestsToTransferNum.length}`);
          
          // Use the result that found requests
          const requestsToTransfer = requestsToTransferStr.length > 0 ? requestsToTransferStr : requestsToTransferNum;

          console.log(`🔍 DEBUG: Found ${requestsToTransfer.length} requests to transfer`);
          if (requestsToTransfer.length > 0) {
            console.log(`🔍 DEBUG: First request formData:`, requestsToTransfer[0].formData);
          }

          transferredCount = requestsToTransfer.length;

          if (transferredCount > 0) {
            // Get backup technician details for formData update
            const backupTech = await tx.technician.findFirst({
              where: { userId: backupTechId },
              include: { user: true }
            });

            const backupTechName = backupTech ? 
              (backupTech.displayName || `${backupTech.user.emp_fname} ${backupTech.user.emp_lname}`.trim()) :
              'Backup Technician';
            const backupTechEmail = backupTech?.user?.emp_email || '';

            // Get original technician details for complete backup tracking
            const originalTech = await tx.technician.findFirst({
              where: { userId: originalTechId },
              include: { user: true }
            });

            const originalTechName = originalTech ? 
              (originalTech.displayName || `${originalTech.user.emp_fname} ${originalTech.user.emp_lname}`.trim()) :
              'Original Technician';
            const originalTechEmail = originalTech?.user?.emp_email || '';

            console.log(`🔄 TRANSFER: ${originalTechName} → ${backupTechName}`);

            // Update each request individually to modify formData
            for (const request of requestsToTransfer) {
              const currentFormData = request.formData as any || {};
              
              console.log(`🔄 Transferring request ${request.id} from ${currentFormData.assignedTechnician || 'Unknown'} to ${backupTechName}`);
              
              await tx.request.update({
                where: { id: request.id },
                data: {
                  // DO NOT update userId - that's the requester, not the assigned technician!
                  formData: {
                    ...currentFormData,
                    assignedTechnicianId: backupTechId,
                    assignedTechnicianEmail: backupTechEmail,
                    backupTransferredAt: new Date().toISOString(),
                    originalTechnicianId: originalTechId,
                    originalTechnicianEmail: originalTechEmail
                  },
                  updatedAt: new Date()
                }
              });
              
              console.log(`✅ Request ${request.id} transferred successfully`);
            }

            // Log the transferred requests in the backup table
            await tx.request_assignments_backup.createMany({
              data: requestsToTransfer.map(req => ({
                request_id: req.id,
                original_technician_id: originalTechId,
                backup_technician_id: backupTechId,
                backup_config_id: config.id
              }))
            });
          } else {
            console.log('⚠️ No requests found to transfer');
          }
        } else {
          console.log('⚠️ Transfer skipped - either divertExisting=false or backup period hasn\'t started yet');
        }

        console.log(`📊 BACKUP CREATION SUMMARY: Transferred ${transferredCount} requests`);

        // Log the creation
        await tx.backup_technician_logs.create({
          data: {
            backup_config_id: config.id,
            original_technician_id: originalTechId,
            backup_technician_id: backupTechId,
            action_type: 'created',
            details: {
              startDate,
              endDate,
              divertExisting,
              transferredRequests: transferredCount,
              reason
            },
            performed_by: parseInt(session.user.id)
          }
        });

        return { configId: config.id };
      });

      return NextResponse.json({
        success: true,
        configId: result.configId,
        transferredRequests: transferredCount,
        message: `Backup technician configuration created successfully${transferredCount > 0 ? ` and ${transferredCount} existing requests transferred` : ''}`
      });

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error creating backup technician:', error);
    return NextResponse.json(
      { error: 'Failed to create backup technician configuration' },
      { status: 500 }
    );
  }
}