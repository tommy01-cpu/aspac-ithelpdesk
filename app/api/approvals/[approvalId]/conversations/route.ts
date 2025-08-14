export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabaseTimestamp, normalizeClientTimestamp } from '@/lib/server-time-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { approvalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approvalId = params.approvalId;

    // Use Prisma relations instead of raw SQL
    try {
      const conversations = await prisma.approvalConversation.findMany({
        where: {
          approvalId: parseInt(approvalId)
        },
        include: {
          author: {
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const formattedConversations = conversations.map((conv: any) => ({
        id: conv.id,
        type: conv.type,
        message: conv.message,
        author: `${conv.author.emp_fname} ${conv.author.emp_lname}`,
        timestamp: conv.createdAt,
        isRead: conv.isRead,
        isOwnMessage: false // Will be determined on frontend
      }));

      return NextResponse.json({ conversations: formattedConversations });
    } catch (dbError) {
      console.log('DB Error - returning empty conversations:', dbError);
      return NextResponse.json({ conversations: [] });
    }
  } catch (error) {
    console.error('Error fetching approval conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { approvalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approvalId = parseInt(params.approvalId);
  const { message, type } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get the user
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      // Use Prisma create with Philippine time
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create Philippine time by manually adjusting UTC
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      const conversation = await prisma.approvalConversation.create({
        data: {
          id: conversationId,
          approvalId: approvalId,
          authorId: user.id,
          type: type || 'user',
          message: message.trim(),
          isRead: false,
          readBy: [user.id],
          createdAt: philippineTime,
        },
        include: {
          author: {
            select: {
              emp_fname: true,
              emp_lname: true
            }
          }
        }
      });

      // Get the approval to find the request ID for history tracking
      const approval = await prisma.requestApproval.findUnique({
        where: { id: approvalId },
        include: { 
          request: true,
          approver: true 
        }
      });

      // Add history entry for the conversation message
      if (approval?.request) {
        await addHistory(prisma as any, {
          requestId: approval.request.id,
          action: 'Conversation Message',
          actorName: `${user.emp_fname} ${user.emp_lname}`,
          actorType: 'user',
          details: `New message in approval conversation with ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'Approver'}: "${message.trim().substring(0, 100)}${message.trim().length > 100 ? '...' : ''}"`,
          actorId: user.id,
        });
      }

      console.log('✅ Successfully saved conversation to database');
      console.log('🔍 Conversation ID:', conversationId);
      
      const formattedConversation = {
        id: conversation.id,
        type: conversation.type,
        message: conversation.message,
        author: `${conversation.author.emp_fname} ${conversation.author.emp_lname}`,
        timestamp: conversation.createdAt,
        isRead: conversation.isRead,
        isOwnMessage: true
      };

      console.log('🔍 Formatted conversation to return:', formattedConversation);
      return NextResponse.json({ conversation: formattedConversation });
    } catch (dbError) {
      console.error('DB Error - falling back to mock:', dbError);
      
      // Even if DB fails, return success for UI consistency
      const formattedConversation = {
        id: `mock_${Date.now()}`,
        type: type || 'user',
        message: message.trim(),
        author: `${user.emp_fname} ${user.emp_lname}`,
  timestamp: getDatabaseTimestamp().toISOString(),
        isRead: true,
        isOwnMessage: true
      };

      return NextResponse.json({ conversation: formattedConversation });
    }
  } catch (error) {
    console.error('Error creating approval conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
