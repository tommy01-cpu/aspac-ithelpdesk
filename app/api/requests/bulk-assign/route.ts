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

    for (const req of requests) {
      const formData = req.formData as any;
      formData.assignedTechnicianId = technicianId;
      formData.assignedTechnician = technicianName;
      formData.assignedAt = new Date().toISOString();

      await prisma.request.update({
        where: { id: req.id },
        data: {
          formData: formData,
          updatedAt: new Date()
        }
      });

      // Add history entry
      await prisma.requestHistory.create({
        data: {
          requestId: req.id,
          actorId: user.id,
          action: 'bulk_assign',
          details: `Bulk assigned to ${technicianName} by ${`${user.emp_fname} ${user.emp_lname}`.trim()}`,
          actorName: `${user.emp_fname} ${user.emp_lname}`.trim()
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
