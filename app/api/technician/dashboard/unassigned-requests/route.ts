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

    // Get unassigned requests
    const unassignedRequests = await prisma.request.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: null
                }
              },
              {
                formData: {
                  path: ['assignedTechnician'],
                  equals: null
                }
              },
              {
                NOT: {
                  formData: {
                    path: ['assignedTechnicianId'],
                    not: null
                  }
                }
              }
            ]
          },
          {
            status: {
              in: ['open', 'on_hold', 'for_approval']
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedRequests = unassignedRequests.map(request => {
      const formData = request.formData as any;
      return {
        id: request.id,
        title: formData?.['8'] || formData?.issueTitle || formData?.subject || 'No title',
        priority: formData?.['2'] || formData?.priority || 'medium',
        category: formData?.['6'] || formData?.category || 'General',
        createdAt: request.createdAt.toISOString()
      };
    });

    return NextResponse.json(transformedRequests);
  } catch (error) {
    console.error('Unassigned requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch unassigned requests' }, { status: 500 });
  }
}
