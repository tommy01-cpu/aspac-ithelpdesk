import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyRequestAssigned } from '@/lib/notifications';
import { addHistory } from '@/lib/history';

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
    const technicianEmail = technician.emp_email;
    const formData = existingRequest.formData as any;
    
    // Update assignment
    formData.assignedTechnicianId = technicianId;
    formData.assignedTechnician = technicianName;
    formData.assignedTechnicianEmail = technicianEmail;
    formData.assignedAt = new Date().toISOString();

    await prisma.request.update({
      where: { id: requestId },
      data: {
        formData: formData,
        updatedAt: new Date()
      }
    });

    // Add history entry following the standard format with proper Philippine time
    const actorName = `${user.emp_fname} ${user.emp_lname}`.trim();
    await addHistory(prisma as any, {
      requestId: requestId,
      action: 'Technician-Reassigned',
      details: `Assigned to : ${technicianName}\nPrevious Technician : ${formData.assignedTechnician || 'None'}\nTechnician Email : ${technicianEmail}`,
      actorId: user.id,
      actorName: actorName,
      actorType: "user"
    });

    // Send email notifications to both requester and technician
    try {
      // Get the updated request with user data for notifications
      const requestWithUser = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              emp_email: true,
              emp_fname: true,
              emp_lname: true,
              department: true,
            }
          }
        }
      });

      // Get template data if available
      let templateData = null;
      if (requestWithUser?.templateId) {
        templateData = await prisma.template.findUnique({
          where: { id: parseInt(requestWithUser.templateId) },
          select: {
            id: true,
            name: true,
            description: true,
          }
        });
      }

      if (requestWithUser) {
        await notifyRequestAssigned(requestWithUser, templateData, technician);
      }
    } catch (notificationError) {
      console.error('Error sending assignment notifications:', notificationError);
      // Don't fail the assignment if notifications fail
    }

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
