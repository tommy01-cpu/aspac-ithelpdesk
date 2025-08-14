import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import prismaAttachments only when needed
    const { prismaAttachments } = require('@/lib/prisma-attachments');

    const attachmentId = params.id;
    
    // Get the attachment from database
    const attachment = await prismaAttachments.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Create response with file content
    const response = new NextResponse(attachment.fileContent, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': attachment.size.toString(),
        'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

    return response;

  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
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
