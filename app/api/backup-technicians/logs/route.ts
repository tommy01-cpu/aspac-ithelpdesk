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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await prisma.backup_technician_logs.findMany({
      include: {
        original_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        },
        backup_technician: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      },
      orderBy: {
        performed_at: 'desc'
      },
      take: limit
    });

    // Transform data to match expected format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      backup_config_id: log.backup_config_id,
      original_technician_id: log.original_technician_id,
      backup_technician_id: log.backup_technician_id,
      original_technician_name: `${log.original_technician.emp_fname} ${log.original_technician.emp_lname}`,
      backup_technician_name: `${log.backup_technician.emp_fname} ${log.backup_technician.emp_lname}`,
      action_type: log.action_type,
      details: log.details,
      performed_by: log.performed_by,
      performed_at: log.performed_at
    }));

    return NextResponse.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching backup technician logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backup technician logs' },
      { status: 500 }
    );
  }
}