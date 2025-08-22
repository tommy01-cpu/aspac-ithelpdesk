import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'email' } = body;

    const userId = parseInt(session.user.id);

    if (type === 'notification') {
      // Test in-app notification
      const success = await createNotification({
        userId,
        type: 'REQUEST_CREATED',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working correctly.',
        data: { testData: true }
      });

      return NextResponse.json({ 
        success, 
        message: success ? 'Test notification created successfully' : 'Failed to create notification'
      });
    } 
    
    if (type === 'email') {
      // Test email
      const userEmail = session.user.email;
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      const success = await sendEmail({
        to: userEmail,
        subject: 'IT HELPDESK: Test Email',
        message: `Hello ${session.user.name},\n\nThis is a test email to verify the email notification system is working correctly.\n\nBest regards,\nIT Helpdesk System`
      });

      return NextResponse.json({ 
        success, 
        message: success ? `Test email sent to ${userEmail}` : 'Failed to send test email'
      });
    }

    return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });

  } catch (error) {
    console.error('Error in test notifications:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
