import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get resolution attachments for a request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;

    // Import prismaAttachments only when needed
    const { prismaAttachments } = require('@/lib/prisma-attachments');

    const attachments = await prismaAttachments.attachment.findMany({
      where: {
        requestId: requestId,
        type: 'resolution', // Only resolution attachments
      },
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
    console.error('Error fetching resolution attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resolution attachments' },
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
