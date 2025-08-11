import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);

    // Get formData which may contain conversations
    const requestData = await prisma.request.findFirst({
      where: { id: requestId },
      select: {
        formData: true
      }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Extract conversations from formData
    const formData = requestData.formData as any;
    const conversations = formData?.conversations || [];

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching request conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    const { message, attachments } = await request.json();

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

    // Get current request to get existing formData
    const currentRequest = await prisma.request.findFirst({
      where: { id: requestId },
      select: {
        formData: true,
        userId: true
      }
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Create new conversation entry
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      message: message.trim(),
      author: `${user.emp_fname} ${user.emp_lname}`,
      timestamp: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString(), // Subtract 8 hours
      authorId: user.id,
      attachments: attachments || [] // Store attachment information
    };

    // Get existing formData and add conversation to it
    const currentFormData = currentRequest.formData as any;
    const existingConversations = currentFormData?.conversations || [];
    const updatedConversations = [...existingConversations, newConversation];

    // Update formData with new conversation
    const updatedFormData = {
      ...currentFormData,
      conversations: updatedConversations
    };

    // Update the request with new conversation in formData
    await prisma.request.update({
      where: { id: requestId },
      data: {
        formData: updatedFormData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      conversation: newConversation
    });
  } catch (error) {
    console.error('Error adding conversation:', error);
    return NextResponse.json(
      { error: 'Failed to add conversation' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
