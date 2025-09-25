import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch backup approver logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch backup approver logs with related data
    const logs = await prisma.backup_approver_logs.findMany({
      include: {
        backup_config: {
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
        },
        performer: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          },
        },
      },
      orderBy: {
        performed_at: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Transform the data to include computed fields
    const transformedLogs = logs.map(log => ({
      ...log,
      original_approver_name: log.backup_config ? 
        `${log.backup_config.original_approver.emp_fname} ${log.backup_config.original_approver.emp_lname}` : 
        'Unknown',
      backup_approver_name: log.backup_config ? 
        `${log.backup_config.backup_approver.emp_fname} ${log.backup_config.backup_approver.emp_lname}` : 
        'Unknown',
      performed_by_name: log.performer ? 
        `${log.performer.emp_fname} ${log.performer.emp_lname}` : 
        'System',
    }));

    return NextResponse.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching backup approver logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}