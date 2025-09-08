import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Get the request and extract resolution attachments from formData
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      select: { formData: true }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const formData = requestData.formData as any;
    const resolutionAttachmentIds = formData?.resolution?.attachments || [];
    
    console.log(`🔍 Resolution Attachments Debug for request ${requestId}:`);
    console.log(`📄 Full formData.resolution:`, formData?.resolution);
    console.log(`📎 Resolution attachment IDs:`, resolutionAttachmentIds);
    console.log(`🔢 Number of attachment IDs:`, resolutionAttachmentIds.length);

    if (!Array.isArray(resolutionAttachmentIds) || resolutionAttachmentIds.length === 0) {
      return NextResponse.json({ attachments: [] });
    }

    try {
      // Import prismaAttachments only when needed
      const { prismaAttachments } = require('@/lib/prisma-attachments');
      
      const attachments = await prismaAttachments.attachment.findMany({
        where: {
          id: {
            in: resolutionAttachmentIds
          }
        },
        select: {
          id: true,
          originalName: true,
          fileName: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
          requestId: true
        }
      });

      console.log(`📎 Found ${attachments.length} resolution attachments for request ${requestId}`);
      console.log(`📋 Attachment details:`, attachments.map((a: any) => ({ id: a.id, name: a.originalName, size: a.size })));
      
      return NextResponse.json({ attachments });
    } catch (attachmentError) {
      console.error('Error accessing attachments database:', attachmentError);
      // If attachments database is not available, return empty array
      return NextResponse.json({ attachments: [] });
    }

  } catch (error) {
    console.error('Error fetching resolution attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resolution attachments' },
      { status: 500 }
    );
  }
}
