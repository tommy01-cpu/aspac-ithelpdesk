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

    // Get requests assigned to current technician
    const assignedRequests = await prisma.request.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      },
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
    const transformedRequests = await Promise.all(assignedRequests.map(async (request) => {
      const formData = request.formData as any;
      return {
        id: request.id,
        title: formData?.['8'] || formData?.issueTitle || formData?.subject || 'No title',
        description: formData?.['9'] || formData?.issueDescription || formData?.description || '',
        requester: `${request.user?.emp_fname || ''} ${request.user?.emp_lname || ''}`.trim(),
        requesterEmail: request.user?.emp_email || '',
        priority: formData?.['2'] || formData?.priority || 'medium',
        status: request.status,
        category: formData?.['6'] || formData?.category || 'General',
        assignedTechnicianId: formData?.assignedTechnicianId,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString()
      };
    }));

    return NextResponse.json(transformedRequests);
  } catch (error) {
    console.error('Assigned requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch assigned requests' }, { status: 500 });
  }
}
