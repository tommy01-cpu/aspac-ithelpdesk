import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// DELETE - Delete a specific notification
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    const userId = parseInt(session.user.id);

    // Check if notification exists and belongs to the user
    const notification = await prisma.notification.findFirst({
      where: { 
        id: notificationId,
        userId 
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete notification' 
    }, { status: 500 });
  }
}
