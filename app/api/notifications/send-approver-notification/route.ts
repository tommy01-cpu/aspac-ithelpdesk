import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendNewApproverNotificationEmail } from '@/lib/email';

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
        user: true,
        template: {
          include: {
            service: true,
            category: true
          }
        }
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Send email to each new approver
    const emailPromises = approvers.map(async (approver: any) => {
      try {
        await sendNewApproverNotificationEmail(
          approver.email,
          approver.name,
          {
            requestId: serviceRequest.id,
            requestTitle: serviceRequest.title,
            requesterName: `${serviceRequest.user.emp_fname} ${serviceRequest.user.emp_lname}`,
            serviceName: serviceRequest.template?.service?.name || 'Service Request',
            categoryName: serviceRequest.template?.category?.name || 'General',
            level: approver.level,
            priority: serviceRequest.priority,
            createdAt: serviceRequest.createdAt
          },
          template || 'notify-approver-approval'
        );
        return { success: true, email: approver.email };
      } catch (error) {
        console.error(`Failed to send email to ${approver.email}:`, error);
        return { success: false, email: approver.email, error: error.message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    return NextResponse.json({ 
      success: true, 
      emailsSent: successCount,
      totalEmails: approvers.length,
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
