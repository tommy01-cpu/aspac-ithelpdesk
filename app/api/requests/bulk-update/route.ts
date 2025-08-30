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
    const { requestIds, updates } = body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request IDs' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update all specified requests
    const updateData: any = {
      updatedAt: new Date()
    };

    // Handle status updates
    if (updates.status) {
      updateData.status = updates.status;
    }

    // Handle priority updates
    if (updates.priority) {
      // For priority updates, we need to update the formData
      const requests = await prisma.request.findMany({
        where: {
          id: {
            in: requestIds
          }
        }
      });

      for (const req of requests) {
        const formData = req.formData as any;
        formData['2'] = updates.priority; // Assuming field 2 is priority
        formData.priority = updates.priority;

        await prisma.request.update({
          where: { id: req.id },
          data: {
            formData: formData,
            status: updates.status || req.status,
            updatedAt: new Date()
          }
        });

        // Add history entry
        await prisma.requestHistory.create({
          data: {
            requestId: req.id,
            actorId: user.id,
            action: 'bulk_update',
            details: `Bulk updated: ${Object.keys(updates).join(', ')} by ${`${user.emp_fname} ${user.emp_lname}`.trim()}`,
            actorName: `${user.emp_fname} ${user.emp_lname}`.trim()
          }
        });
      }
    } else {
      // Simple status update
      await prisma.request.updateMany({
        where: {
          id: {
            in: requestIds
          }
        },
        data: updateData
      });

      // Add history entries for each request
      for (const requestId of requestIds) {
        await prisma.requestHistory.create({
          data: {
            requestId: requestId,
            actorId: user.id,
            action: 'bulk_update',
            details: `Bulk updated: ${Object.keys(updates).join(', ')} by ${`${user.emp_fname} ${user.emp_lname}`.trim()}`,
            actorName: `${user.emp_fname} ${user.emp_lname}`.trim()
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: requestIds.length,
      message: `Successfully updated ${requestIds.length} requests`
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Failed to update requests' }, { status: 500 });
  }
}
