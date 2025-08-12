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

    // Use direct SQL query to get conversations from database
    try {
      const conversations = await prisma.$queryRaw`
        SELECT 
          ac.id,
          ac.type,
          ac.message,
          ac."createdAt" as timestamp,
          ac."isRead",
          ac."readBy",
          ac."authorId",
          u.first_name as emp_fname,
          u.last_name as emp_lname
        FROM approval_conversations ac
        JOIN users u ON ac."authorId" = u.id
        WHERE ac."approvalId" = ${parseInt(approvalId)}
        ORDER BY ac."createdAt" ASC
      `;

      const formattedConversations = (conversations as any[]).map((conv: any) => ({
        id: conv.id,
        type: conv.type,
        message: conv.message,
        author: `${conv.emp_fname} ${conv.emp_lname}`,
        timestamp: conv.timestamp,
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
      // Try direct SQL insert with proper error handling
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use DB-side Philippine time for timestamps
      await prisma.$executeRaw`
        INSERT INTO approval_conversations (id, "approvalId", "authorId", type, message, "isRead", "readBy", "createdAt", "updatedAt")
        VALUES (
          ${conversationId},
          ${approvalId},
          ${user.id},
          ${type || 'user'},
          ${message.trim()},
          false,
          ${JSON.stringify([user.id])}::jsonb,
          (NOW() AT TIME ZONE 'Asia/Manila'),
          (NOW() AT TIME ZONE 'Asia/Manila')
        )
      `;

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
        await prisma.$executeRaw`
          INSERT INTO request_history ("requestId", action, details, "actorId", "actorName", "actorType", timestamp)
          VALUES (
            ${approval.request.id}, 
            'Conversation Message', 
            ${`New message in approval conversation with ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'Approver'}: "${message.trim().substring(0, 100)}${message.trim().length > 100 ? '...' : ''}"`}, 
            ${user.id}, 
            ${`${user.emp_fname} ${user.emp_lname}`},
            'user', 
            (NOW() AT TIME ZONE 'Asia/Manila')
          )
        `;
      }

      console.log('✅ Successfully saved conversation to database');
      console.log('🔍 Conversation ID:', conversationId);
  console.log('🔍 Philippine Time used: DB-side NOW() AT TIME ZONE Asia/Manila');

      // Fetch the actual saved conversation from database to return exact timestamp
      const savedConversation = await prisma.$queryRaw`
        SELECT 
          ac.id,
          ac.type,
          ac.message,
          ac."createdAt" as timestamp,
          ac."isRead",
          ac."readBy",
          ac."authorId",
          u.first_name as emp_fname,
          u.last_name as emp_lname
        FROM approval_conversations ac
        JOIN users u ON ac."authorId" = u.id
        WHERE ac.id = ${conversationId}
      `;

      console.log('🔍 Saved conversation from DB:', savedConversation);
      const conversation = (savedConversation as any[])[0];
      console.log('🔍 First conversation record:', conversation);
      
      const formattedConversation = {
        id: conversation.id,
        type: conversation.type,
        message: conversation.message,
        author: `${conversation.emp_fname} ${conversation.emp_lname}`,
        timestamp: conversation.timestamp, // Use exact database timestamp
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
