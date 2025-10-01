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

    // Get recent requests (last 10)
    const recentRequests = await prisma.request.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      where: {
        status: {
          not: 'closed'
        }
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
    const transformedRequests = await Promise.all(recentRequests.map(async (request) => {
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
    console.error('Recent requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent requests' }, { status: 500 });
  }
}
