import { prisma } from '@/lib/prisma';

/**
 * Background service to handle backup technician auto-reversion
 * This should be called by a cron job or scheduled task
 */
export class BackupTechnicianService {
  
  /**
   * Process expired backup technician configurations and revert assigned requests
   */
  static async processExpiredBackupConfigurations() {
    try {
      console.log('Starting backup technician auto-reversion process...');
      
      const now = new Date();
      
      // Find all active backup configurations that have expired
      const expiredConfigs = await (prisma as any).backup_technicians.findMany({
        where: {
          is_active: true,
          end_date: {
            lt: now, // end_date is less than current time
          },
        },
        include: {
          original_technician: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
          backup_technician: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
        },
      });

      console.log(`Found ${expiredConfigs.length} expired backup technician configurations`);

      let totalRevertedRequests = 0;

      for (const config of expiredConfigs) {
        const revertedCount = await this.revertExpiredConfiguration(config);
        totalRevertedRequests += revertedCount;
      }

      console.log('Backup technician auto-reversion process completed');
      return {
        processedConfigs: expiredConfigs.length,
        totalRevertedRequests,
        timestamp: now,
      };
    } catch (error) {
      console.error('Error in backup technician auto-reversion process:', error);
      throw error;
    }
  }

  /**
   * Revert a specific expired backup configuration
   */
  private static async revertExpiredConfiguration(config: any): Promise<number> {
    try {
      console.log(`Processing expired config ID: ${config.id} (${config.original_technician.emp_fname} ${config.original_technician.emp_lname} -> ${config.backup_technician.emp_fname} ${config.backup_technician.emp_lname})`);

      let revertedCount = 0;

      await prisma.$transaction(async (tx) => {
        // Get requests to revert - find by assignedTechnicianId in formData
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

        revertedCount = requestsToRevert.length;

        if (revertedCount > 0) {
          // Get original technician user details directly
          const originalUser = await tx.users.findUnique({
            where: { id: config.original_technician_id },
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            }
          });

          const originalTechName = originalUser ? 
            `${originalUser.emp_fname} ${originalUser.emp_lname}`.trim() :
            'Original Technician';
          const originalTechEmail = originalUser?.emp_email || '';

          // Get backup technician user details directly
          const backupUser = await tx.users.findUnique({
            where: { id: config.backup_technician_id },
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            }
          });

          const backupTechName = backupUser ? 
            `${backupUser.emp_fname} ${backupUser.emp_lname}`.trim() :
            'Backup Technician';

          // Update each request individually to restore original technician in formData
          for (const request of requestsToRevert) {
            const currentFormData = request.formData as any || {};
            
            // Use Philippine time (UTC+8)
            const now = new Date();
            const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
            
            await tx.request.update({
              where: { id: request.id },
              data: {
                formData: {
                  ...currentFormData,
                  assignedTechnicianId: config.original_technician_id,
                  assignedTechnicianEmail: originalTechEmail,
                  autoRevertedAt: philippineTime.toISOString(),
                  autoRevertedReason: 'Backup technician period expired',
                  // Remove backup-related fields
                  backupTransferredAt: undefined,
                  originalTechnicianId: undefined
                },
                updatedAt: philippineTime
              }
            });

            // Create request history entry with Philippine time
            await tx.requestHistory.create({
              data: {
                requestId: request.id,
                action: 'Technician-Reassigned',
                details: `Assigned to: ${originalTechName}\nPrevious Technician: ${backupTechName}\nReason: Backup technician period expired (auto-reverted)`,
                actorId: null, // System action
                actorName: 'System',
                actorType: 'system',
                timestamp: philippineTime,
              },
            });
          }

          console.log(`Reverted ${revertedCount} requests back to original technician`);
        }

        // Use Philippine time for all updates
        const now = new Date();
        const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

        // Mark backup assignments as reverted
        await tx.request_assignments_backup.updateMany({
          where: {
            backup_config_id: config.id,
            reverted_at: null
          },
          data: {
            reverted_at: philippineTime
          }
        });

        // Deactivate the configuration
        await tx.backup_technicians.update({
          where: { id: config.id },
          data: {
            is_active: false,
            updated_at: philippineTime
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
            performed_by: null // System action
          }
        });

        console.log(`Config ${config.id} processed: ${revertedCount} requests reverted`);
      });

      // Send notifications about the reversion if there were requests
      if (revertedCount > 0) {
        await this.sendReversionNotification(config, revertedCount);
      }

      return revertedCount;
    } catch (error) {
      console.error(`Error processing expired config ${config.id}:`, error);
      
      // Log the error
      try {
        await (prisma as any).backup_technician_logs.create({
          data: {
            backup_config_id: config.id,
            original_technician_id: config.original_technician_id,
            backup_technician_id: config.backup_technician_id,
            action_type: 'auto_reversion_error',
            details: {
              error: (error as Error).message,
              failedAt: new Date(),
            },
            performed_by: null,
          },
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      return 0; // Return 0 reverted requests on error
    }
  }

  /**
   * Send notification about request reversion
   */
  private static async sendReversionNotification(config: any, revertedCount: number) {
    try {
      // Create notification for original technician
      await prisma.notification.create({
        data: {
          userId: config.original_technician_id,
          type: 'BACKUP_PERIOD_ENDED',
          title: 'Requests Reverted Back to You',
          message: `${revertedCount} request(s) have been automatically reverted back to you after the backup technician period ended.`,
          data: {
            backupConfigId: config.id,
            backupTechnicianName: `${config.backup_technician.emp_fname} ${config.backup_technician.emp_lname}`,
            revertedCount,
            endDate: config.end_date,
          },
          isRead: false,
        },
      });

      // Create notification for backup technician
      await prisma.notification.create({
        data: {
          userId: config.backup_technician_id,
          type: 'BACKUP_PERIOD_ENDED',
          title: 'Backup Technician Period Ended',
          message: `Your backup technician period has ended. ${revertedCount} request(s) have been reverted back to ${config.original_technician.emp_fname} ${config.original_technician.emp_lname}.`,
          data: {
            backupConfigId: config.id,
            originalTechnicianName: `${config.original_technician.emp_fname} ${config.original_technician.emp_lname}`,
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

      const upcomingExpirations = await (prisma as any).backup_technicians.findMany({
        where: {
          is_active: true,
          end_date: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        include: {
          original_technician: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
            },
          },
          backup_technician: {
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
      console.error('Error fetching upcoming technician expirations:', error);
      throw error;
    }
  }
}