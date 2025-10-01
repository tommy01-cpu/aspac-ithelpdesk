import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const configId = parseInt(params.id);

    // Get the backup configuration
    const config = await (prisma as any).backup_technicians.findUnique({
      where: { id: configId },
      include: {
        original_technician: {
          select: {
            id: true,
            userId: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        backup_technician: {
          select: {
            id: true,
            userId: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    // Find requests currently assigned to backup technician
    const requestsWithBackupStr = await prisma.request.findMany({
      where: {
        status: { in: ['open', 'on_hold'] },
        formData: {
          path: ['assignedTechnicianId'],
          equals: config.backup_technician_id.toString()
        }
      },
      select: { 
        id: true, 
        formData: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    const requestsWithBackupNum = await prisma.request.findMany({
      where: {
        status: { in: ['open', 'on_hold'] },
        formData: {
          path: ['assignedTechnicianId'],
          equals: config.backup_technician_id
        }
      },
      select: { 
        id: true, 
        formData: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    // Get all requests with this backup technician ID (regardless of status)
    const allRequestsWithBackup = await prisma.request.findMany({
      where: {
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
      select: { 
        id: true, 
        formData: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    return NextResponse.json({
      config: {
        id: config.id,
        originalTechnicianId: config.original_technician_id,
        backupTechnicianId: config.backup_technician_id,
        isActive: config.is_active,
        startDate: config.start_date,
        endDate: config.end_date,
        originalTechnician: config.original_technician,
        backupTechnician: config.backup_technician
      },
      debug: {
        requestsFoundWithStringQuery: requestsWithBackupStr.length,
        requestsFoundWithNumberQuery: requestsWithBackupNum.length,
        totalRequestsWithBackupTechnician: allRequestsWithBackup.length,
        sampleRequests: allRequestsWithBackup.slice(0, 3).map(req => ({
          id: req.id,
          status: req.status,
          assignedTechnicianId: (req.formData as any)?.assignedTechnicianId,
          assignedTechnicianIdType: typeof (req.formData as any)?.assignedTechnicianId,
          backupTransferredAt: (req.formData as any)?.backupTransferredAt,
          originalTechnicianId: (req.formData as any)?.originalTechnicianId,
          requester: `${req.user.emp_fname} ${req.user.emp_lname}`
        }))
      },
      openOnHoldRequestsWithBackup: {
        stringQuery: requestsWithBackupStr.length,
        numberQuery: requestsWithBackupNum.length,
        requests: [...requestsWithBackupStr, ...requestsWithBackupNum].map(req => ({
          id: req.id,
          status: req.status,
          assignedTechnicianId: (req.formData as any)?.assignedTechnicianId,
          assignedTechnicianIdType: typeof (req.formData as any)?.assignedTechnicianId,
          backupTransferredAt: (req.formData as any)?.backupTransferredAt,
          originalTechnicianId: (req.formData as any)?.originalTechnicianId,
          requester: `${req.user.emp_fname} ${req.user.emp_lname}`,
          createdAt: req.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error in backup technician debug:', error);
    return NextResponse.json(
      { error: 'Failed to debug backup technician configuration' },
      { status: 500 }
    );
  }
}