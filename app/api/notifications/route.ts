import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadNotificationCount 
} from '@/lib/notifications';

// GET - Get user notifications
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const userId = parseInt(session.user.id);
    
    let notifications;
    if (unreadOnly) {
      notifications = await prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } else {
      notifications = await getUserNotifications(userId, limit);
    }

    const unreadCount = await getUnreadNotificationCount(userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Mark notification(s) as read
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;
    const userId = parseInt(session.user.id);

    if (markAllAsRead) {
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (notificationId) {
      await markNotificationAsRead(notificationId, userId);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
