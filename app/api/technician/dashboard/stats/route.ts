import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current user
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total requests
    const totalRequests = await prisma.request.count({
      where: {
        status: {
          not: 'closed'
        }
      }
    });

    // Get pending requests
    const pendingRequests = await prisma.request.count({
      where: {
        status: {
          in: ['open', 'pending', 'on-hold']
        }
      }
    });

    // Get requests resolved today
    const resolvedToday = await prisma.request.count({
      where: {
        status: 'resolved',
        updatedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get overdue requests (basic check for requests older than 3 days without resolution)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const overdueRequests = await prisma.request.count({
      where: {
        status: {
          in: ['open', 'in-progress', 'pending']
        },
        createdAt: {
          lt: threeDaysAgo
        }
      }
    });

    // Get requests assigned to current technician
    const myAssignedRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: user.id
            }
          },
          {
            formData: {
              path: ['assignedTechnician'],
              equals: `${user.emp_fname} ${user.emp_lname}`.trim()
            }
          }
        ],
        status: {
          not: 'closed'
        }
      }
    });

    const stats = {
      totalRequests,
      pendingRequests,
      resolvedToday,
      overdueRequests,
      myAssignedRequests
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
