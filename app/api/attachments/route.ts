import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import prismaAttachments only when needed
    const { prismaAttachments } = require('@/lib/prisma-attachments');

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const requestId = formData.get('requestId') as string;
    const type = formData.get('type') as string || 'request'; // Default to 'request' type

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB.` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const fileName = `${session.user.id}_${timestamp}.${fileExtension}`;
      
      // Get file content as buffer
      const bytes = await file.arrayBuffer();
      const fileContent = Buffer.from(bytes);

      // Save file content directly to attachments database
      const attachment = await prismaAttachments.attachment.create({
        data: {
          fileName,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileContent, // Binary content stored in database
          requestId: requestId || null,
          userId: String(session.user.id),
          type: type, // Set the attachment type
        },
      });

      uploadedFiles.push({
        id: attachment.id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        size: attachment.size,
        mimeType: attachment.mimeType,
      });
    }

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles 
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  } finally {
    try {
      // In dev, proactively disconnect to free connections quickly
      if (process.env.NODE_ENV !== 'production') {
        const { prismaAttachments } = require('@/lib/prisma-attachments');
        await prismaAttachments.$disconnect();
      }
    } catch {}
  }
}

// Get attachments for a request
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import prismaAttachments only when needed
    const { prismaAttachments } = require('@/lib/prisma-attachments');

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // Optional filter by type

    if (!requestId && !userId) {
      return NextResponse.json({ error: 'requestId or userId required' }, { status: 400 });
    }

    const where: any = {};
    if (requestId) where.requestId = requestId;
    if (userId) where.userId = userId;
    if (type) where.type = type; // Filter by type if specified

    const attachments = await prismaAttachments.attachment.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
        // Don't select fileContent for list view (too much data)
      },
    });

    return NextResponse.json({ attachments });

  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  } finally {
    try {
      if (process.env.NODE_ENV !== 'production') {
        const { prismaAttachments } = require('@/lib/prisma-attachments');
        await prismaAttachments.$disconnect();
      }
    } catch {}
  }
}
