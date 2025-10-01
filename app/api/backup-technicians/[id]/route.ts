import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const configId = parseInt(params.id);
    const body = await request.json();

    // Handle deactivation
    if ('is_active' in body && body.is_active === false) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Get config details for logging
          const config = await (tx as any).backup_technicians.findUnique({
            where: { id: configId }
          });

          if (!config) {
            throw new Error('Configuration not found');
          }

          // Get requests to revert - find by assignedTechnicianId in formData, NOT userId
          // Try both string and number formats since assignedTechnicianId might be stored differently
          const requestsToRevert = await tx.request.findMany({
            where: {
              status: {
                in: ['open', 'on_hold']
              },
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: config.backup_technician_id
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: config.backup_technician_id.toString()
                  }
                }
              ]
            },
            select: { id: true, formData: true }
          });

          const revertedCount = requestsToRevert.length;
          console.log(`🔄 DEACTIVATION: Found ${revertedCount} requests to revert for backup technician ID ${config.backup_technician_id}`);

          // Debug: Log a few request IDs and their current formData
          requestsToRevert.slice(0, 3).forEach(req => {
            const formData = req.formData as any;
            console.log(`   Request ${req.id}: assignedTechnicianId = ${formData?.assignedTechnicianId} (type: ${typeof formData?.assignedTechnicianId})`);
          });

          if (revertedCount > 0) {
            // Get original technician details for formData update
            const originalTech = await tx.technician.findFirst({
              where: { userId: config.original_technician_id },
              include: { user: true }
            });

            const originalTechName = originalTech ? 
              (originalTech.displayName || `${originalTech.user.emp_fname} ${originalTech.user.emp_lname}`.trim()) :
              'Original Technician';
            const originalTechEmail = originalTech?.user?.emp_email || '';

            // Update each request individually to restore original technician in formData
            for (const request of requestsToRevert) {
              const currentFormData = request.formData as any || {};
              
              console.log(`   🔄 Reverting request ${request.id}: ${config.backup_technician_id} → ${config.original_technician_id}`);
              
              await tx.request.update({
                where: { id: request.id },
                data: {
                  // DO NOT update userId - that's the requester, not the assigned technician!
                  formData: {
                    ...currentFormData,
                    assignedTechnicianId: config.original_technician_id,
                    assignedTechnicianEmail: originalTechEmail,
                    backupRevertedAt: new Date().toISOString(),
                    // Remove backup-related fields
                    backupTransferredAt: undefined,
                    originalTechnicianId: undefined
                  },
                  updatedAt: new Date()
                }
              });
            }
          }

          // Mark backup assignments as reverted
          await tx.request_assignments_backup.updateMany({
            where: {
              backup_config_id: configId,
              reverted_at: null
            },
            data: {
              reverted_at: new Date()
            }
          });

          // Deactivate the configuration
          await tx.backup_technicians.update({
            where: { id: configId },
            data: {
              is_active: false,
              updated_at: new Date()
            }
          });

          // Log the deactivation
          await tx.backup_technician_logs.create({
            data: {
              backup_config_id: configId,
              original_technician_id: config.original_technician_id,
              backup_technician_id: config.backup_technician_id,
              action_type: 'deactivated',
              details: {
                revertedDiversions: revertedCount,
                deactivatedBy: session.user.name,
                reason: 'Manual deactivation'
              },
              performed_by: parseInt(session.user.id)
            }
          });

          return { revertedCount };
        });

        return NextResponse.json({
          success: true,
          revertedRequests: result.revertedCount,
          message: `Configuration deactivated and ${result.revertedCount} requests reverted`
        });

      } catch (error: any) {
        if (error.message === 'Configuration not found') {
          return NextResponse.json(
            { error: 'Backup technician configuration not found' },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // Handle configuration updates
    const {
      originalTechnicianId,
      backupTechnicianId,
      startDate,
      endDate,
      divertExisting,
      reason
    } = body;

    // Convert string IDs to integers
    const originalTechId = parseInt(originalTechnicianId);
    const backupTechId = parseInt(backupTechnicianId);

    // Validation
    if (!originalTechId || !backupTechId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    if (end < today) {
      return NextResponse.json(
        { error: 'End date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check for overlapping configurations (excluding current one)
    const overlapping = await (prisma as any).backup_technicians.findFirst({
      where: {
        original_technician_id: originalTechId,
        is_active: true,
        id: { not: configId },
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

    try {
      await prisma.$transaction(async (tx) => {
        // Update the configuration
        await tx.backup_technicians.update({
          where: { id: configId },
          data: {
            original_technician_id: originalTechId,
            backup_technician_id: backupTechId,
            start_date: start,
            end_date: end,
            divert_existing: divertExisting,
            reason: reason || null,
            updated_at: new Date()
          }
        });

        // Log the update
        await tx.backup_technician_logs.create({
          data: {
            backup_config_id: configId,
            original_technician_id: originalTechId,
            backup_technician_id: backupTechId,
            action_type: 'updated',
            details: {
              startDate,
              endDate,
              divertExisting,
              reason,
              updatedBy: session.user.name
            },
            performed_by: parseInt(session.user.id)
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Backup technician configuration updated successfully'
      });

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error updating backup technician:', error);
    return NextResponse.json(
      { error: 'Failed to update backup technician configuration' },
      { status: 500 }
    );
  }
}