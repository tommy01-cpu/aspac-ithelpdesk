import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// POST - Mark notification(s) as unread
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;
    const userId = parseInt(session.user.id);

    if (markAll) {
      // Mark all notifications as unread for the user
      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: false }
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as unread' });
    } else if (notificationId) {
      // Mark specific notification as unread
      const notification = await prisma.notification.findFirst({
        where: { 
          id: notificationId,
          userId 
        }
      });

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: false }
      });

      return NextResponse.json({ success: true, message: 'Notification marked as unread' });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error marking notifications as unread:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as unread' }, { status: 500 });
  }
}
