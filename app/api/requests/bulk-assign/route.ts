import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { requestIds, technicianId } = body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request IDs' }, { status: 400 });
    }

    if (!technicianId) {
      return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get technician details
    const technician = await prisma.users.findFirst({
      where: { id: technicianId }
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    const technicianName = `${technician.emp_fname} ${technician.emp_lname}`.trim();

    // Update all specified requests
    const requests = await prisma.request.findMany({
      where: {
        id: {
          in: requestIds
        }
      }
    });

    // Use Philippine time (UTC+8)
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    for (const req of requests) {
      const formData = req.formData as any;
      
      // Store previous technician before updating - get from users table using ID
      let previousTechnician = 'None';
      if (formData.assignedTechnicianId) {
        const previousTechUser = await prisma.users.findUnique({
          where: { id: parseInt(formData.assignedTechnicianId) },
          select: {
            emp_fname: true,
            emp_lname: true
          }
        });
        if (previousTechUser) {
          previousTechnician = `${previousTechUser.emp_fname} ${previousTechUser.emp_lname}`.trim();
        }
      }
      
      // Update assignment with consistent format
      formData.assignedTechnicianId = technicianId;
      formData.assignedTechnicianEmail = technician.emp_email;
      formData.assignedTechnician = technicianName; // Store the full name for consistency
      formData.assignedAt = philippineTime.toISOString();

      await prisma.request.update({
        where: { id: req.id },
        data: {
          formData: formData,
          updatedAt: philippineTime
        }
      });

      // Add history entry with consistent format matching individual assignment
      await prisma.requestHistory.create({
        data: {
          requestId: req.id,
          actorId: user.id,
          action: 'Technician-Reassigned',
          details: `Assigned to: ${technicianName}\nPrevious Technician: ${previousTechnician}\nReason: Bulk assignment`,
          actorName: `${user.emp_fname} ${user.emp_lname}`.trim(),
          actorType: 'user',
          timestamp: philippineTime
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      assigned: requestIds.length,
      technicianName,
      message: `Successfully assigned ${requestIds.length} requests to ${technicianName}`
    });
  } catch (error) {
    console.error('Bulk assign error:', error);
    return NextResponse.json({ error: 'Failed to assign requests' }, { status: 500 });
  }
}
