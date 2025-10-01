import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let processedConfigs = 0;
    let totalRevertedRequests = 0;

    // Get expired active configurations
    const expiredConfigs = await (prisma as any).backup_technicians.findMany({
      where: {
        is_active: true,
        end_date: {
          lt: new Date()
        }
      }
    });

    if (expiredConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          processedConfigs: 0,
          totalRevertedRequests: 0,
          message: 'No expired configurations found'
        }
      });
    }

    // Process each expired configuration
    for (const config of expiredConfigs) {
      try {
        await prisma.$transaction(async (tx) => {
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
          totalRevertedRequests += revertedCount;

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
              
              await tx.request.update({
                where: { id: request.id },
                data: {
                  // DO NOT update userId - that's the requester, not the assigned technician!
                  formData: {
                    ...currentFormData,
                    assignedTechnicianId: config.original_technician_id,
                    assignedTechnicianEmail: originalTechEmail,
                    autoRevertedAt: new Date().toISOString(),
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
              backup_config_id: config.id,
              reverted_at: null
            },
            data: {
              reverted_at: new Date()
            }
          });

          // Deactivate the configuration
          await tx.backup_technicians.update({
            where: { id: config.id },
            data: {
              is_active: false,
              updated_at: new Date()
            }
          });

          // Log the auto-reversion
          await tx.backup_technician_logs.create({
            data: {
              backup_config_id: config.id,
              original_technician_id: config.original_technician_id,
              backup_technician_id: config.backup_technician_id,
              action_type: 'auto_reversion',
              details: {
                revertedRequests: revertedCount,
                endDate: config.end_date,
                reason: 'Automatic reversion - backup period expired'
              },
              performed_by: parseInt(session.user.id)
            }
          });

          processedConfigs++;
        });
      } catch (error) {
        console.error(`Error processing expired config ${config.id}:`, error);
        // Continue processing other configs even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        processedConfigs,
        totalRevertedRequests,
        message: `Processed ${processedConfigs} expired configurations and reverted ${totalRevertedRequests} requests`
      }
    });

  } catch (error) {
    console.error('Error processing expired backup technician configurations:', error);
    return NextResponse.json(
      { error: 'Failed to process expired configurations' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get configurations expiring within specified days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const upcomingExpirations = await (prisma as any).backup_technicians.findMany({
      where: {
        is_active: true,
        end_date: {
          gte: new Date(),
          lte: futureDate
        }
      },
      include: {
        original_technician: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        },
        backup_technician: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      },
      orderBy: {
        end_date: 'asc'
      }
    });

    return NextResponse.json({
      upcomingExpirations
    });

  } catch (error) {
    console.error('Error fetching upcoming expirations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming expirations' },
      { status: 500 }
    );
  }
}