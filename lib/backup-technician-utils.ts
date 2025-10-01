import { prisma } from '@/lib/prisma';

/**
 * Get the active backup technician for a given original technician
 * @param originalTechnicianId - ID of the original technician
 * @param date - Date to check (defaults to current date)
 * @returns ID of backup technician if active backup exists, otherwise original technician ID
 */
export async function getActiveBackupTechnician(
  originalTechnicianId: number,
  date: Date = new Date()
): Promise<number> {
  try {
    const backupConfig = await prisma.backup_technicians.findFirst({
      where: {
        original_technician_id: originalTechnicianId,
        is_active: true,
        start_date: { lte: date },
        end_date: { gte: date }
      },
      select: {
        backup_technician_id: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return backupConfig ? backupConfig.backup_technician_id : originalTechnicianId;
  } catch (error) {
    console.error('Error getting active backup technician:', error);
    // Return original technician ID if there's an error
    return originalTechnicianId;
  }
}

/**
 * Check if a technician has an active backup configuration
 * @param originalTechnicianId - ID of the original technician
 * @param date - Date to check (defaults to current date)
 * @returns boolean indicating if backup is active
 */
export async function hasActiveBackup(
  originalTechnicianId: number,
  date: Date = new Date()
): Promise<boolean> {
  try {
    const backupConfig = await prisma.backup_technicians.findFirst({
      where: {
        original_technician_id: originalTechnicianId,
        is_active: true,
        start_date: { lte: date },
        end_date: { gte: date }
      },
      select: {
        id: true
      }
    });

    return !!backupConfig;
  } catch (error) {
    console.error('Error checking for active backup:', error);
    return false;
  }
}

/**
 * Get all active backup configurations for a date
 * @param date - Date to check (defaults to current date)
 * @returns Array of active backup configurations
 */
export async function getActiveBackupConfigurations(date: Date = new Date()) {
  try {
    const activeConfigs = await prisma.backup_technicians.findMany({
      where: {
        is_active: true,
        start_date: { lte: date },
        end_date: { gte: date }
      },
      include: {
        original_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        backup_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    return activeConfigs;
  } catch (error) {
    console.error('Error getting active backup configurations:', error);
    return [];
  }
}