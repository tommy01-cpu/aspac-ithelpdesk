import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyNewApprover } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, approvers, template } = await request.json();

    if (!requestId || !approvers || !Array.isArray(approvers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get request details for email
    const serviceRequest = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        user: true
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Send notification (email + in-app) to each new approver
    const notificationPromises = approvers.map(async (approver: any) => {
      try {
        // Find the approver user data
        const approverUser = await prisma.users.findFirst({
          where: { emp_email: approver.email }
        });

        if (!approverUser) {
          throw new Error(`Approver with email ${approver.email} not found`);
        }

        await notifyNewApprover(
          serviceRequest.id,
          approverUser,
          approver.level || 1
        );
        return { success: true, email: approver.email };
      } catch (error) {
        console.error(`Failed to send notification to ${approver.email}:`, error);
        return { success: false, email: approver.email, error: error instanceof Error ? error.message : String(error) };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    return NextResponse.json({ 
      success: true, 
      notificationsSent: successCount,
      totalNotifications: approvers.length,
      results 
    });

  } catch (error) {
    console.error('Error sending approver notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
