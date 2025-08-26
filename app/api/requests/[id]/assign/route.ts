import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const { technicianId } = body;

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

    // Get the request
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const technicianName = `${technician.emp_fname} ${technician.emp_lname}`.trim();
    const formData = existingRequest.formData as any;
    
    // Update assignment
    formData.assignedTechnicianId = technicianId;
    formData.assignedTechnician = technicianName;
    formData.assignedAt = new Date().toISOString();

    await prisma.request.update({
      where: { id: requestId },
      data: {
        formData: formData,
        updatedAt: new Date()
      }
    });

    // Add history entry
    await prisma.requestHistory.create({
      data: {
        requestId: requestId,
        userId: user.id,
        action: 'assign',
        details: {
          assignedTo: technicianName,
          assignedById: user.id,
          assignedBy: `${user.emp_fname} ${user.emp_lname}`.trim(),
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      technicianName,
      message: `Request assigned to ${technicianName}`
    });
  } catch (error) {
    console.error('Assign request error:', error);
    return NextResponse.json({ error: 'Failed to assign request' }, { status: 500 });
  }
}
