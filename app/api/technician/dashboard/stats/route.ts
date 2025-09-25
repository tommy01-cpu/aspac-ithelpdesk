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

    // Get current user and check if they are a technician
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get technician record for current user
    const technician = await prisma.technician.findFirst({
      where: { 
        userId: user.id,
        isActive: true 
      }
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
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

    // Get pending requests (use 'open' since that's what exists)
    const pendingRequests = await prisma.request.count({
      where: {
        status: 'open'
      }
    });

    // Get requests due today assigned to current technician (open requests with slaDueDate = today)
    const dueTodayRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id.toString()
            }
          }
        ],
        status: {
          in: ['open', 'on_hold'] // Active statuses only
        },
        formData: {
          path: ['slaDueDate'],
          gte: today.toISOString(),
          lt: tomorrow.toISOString()
        }
      }
    });

    // Get ALL overdue requests in system (not filtered by technician)
    const overdueRequests = await prisma.request.count({
      where: {
        status: {
          in: ['open', 'on_hold'] // Active statuses only
        },
        formData: {
          path: ['slaDueDate'],
          lt: today.toISOString()
        }
      }
    });

    // Get MY overdue requests assigned to current technician 
    const myOverdueRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id.toString()
            }
          }
        ],
        status: {
          in: ['open', 'on_hold'] // Active statuses only
        },
        formData: {
          path: ['slaDueDate'],
          lt: today.toISOString()
        }
      }
    });

    // Get requests assigned to current technician (open, on_hold only - exclude resolved)
    const myAssignedRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id.toString()
            }
          }
        ],
        status: {
          in: ['open', 'on_hold'] // Only active statuses (exclude resolved)
        }
      }
    });

    // Get requests that need clarification (on-hold status requests assigned to current user)
    const needClarification = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: technician.id.toString()
            }
          }
        ],
        status: 'on_hold'
      }
    });

    // Calculate average resolution time (in hours)
    const resolvedRequests = await prisma.request.findMany({
      where: {
        status: 'resolved',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let avgResolutionTime = 0;
    if (resolvedRequests.length > 0) {
      const totalTime = resolvedRequests.reduce((sum, req) => {
        const diff = req.updatedAt.getTime() - req.createdAt.getTime();
        return sum + (diff / (1000 * 60 * 60)); // Convert to hours
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedRequests.length);
    }

    // Calculate SLA compliance (percentage of requests resolved on time)
    const totalResolvedLastMonth = await prisma.request.count({
      where: {
        status: 'resolved',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const onTimeResolved = await prisma.request.count({
      where: {
        status: 'resolved',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        // Assuming resolved within 24 hours is on-time for basic calculation
        updatedAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const slaCompliance = totalResolvedLastMonth > 0 
      ? Math.round((onTimeResolved / totalResolvedLastMonth) * 100)
      : 0;

    const stats = {
      totalRequests,
      pendingRequests,
      overdueRequests, // System-wide overdue requests
      myOverdueRequests, // Personal overdue requests for My Summary
      resolvedToday: dueTodayRequests, // Return due today count in resolvedToday field for dashboard display
      myAssignedRequests,
      needClarification,
      avgResolutionTime,
      slaCompliance
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
