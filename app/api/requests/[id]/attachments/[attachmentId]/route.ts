import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = Number(params.id);
    const attachmentId = params.attachmentId;

    if (!Number.isFinite(requestId)) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }

    if (!attachmentId) {
      return NextResponse.json({ error: 'Invalid attachment id' }, { status: 400 });
    }

    // Check if user is technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Only technicians can delete attachments' }, { status: 403 });
    }

    // Get the request to verify it exists and get current form data
    const existingRequest = await prisma.request.findUnique({ 
      where: { id: requestId } 
    });
    
    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Import prismaAttachments to check if attachment exists
    const { prismaAttachments } = require('@/lib/prisma-attachments');
    
    const attachment = await prismaAttachments.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete the attachment from the attachments database
    await prismaAttachments.attachment.delete({
      where: { id: attachmentId }
    });

    // Also remove the attachment ID from the resolution attachments array in formData
    const fd: any = existingRequest.formData || {};
    const resBlock = fd.resolution || {};
    const currentAttachments = Array.isArray(resBlock.attachments) ? resBlock.attachments : [];
    const updatedAttachments = currentAttachments.filter((id: string) => id !== attachmentId);

    const updatedFormData = {
      ...fd,
      resolution: {
        ...resBlock,
        attachments: updatedAttachments
      }
    };

    // Update the request with the new form data
    await prisma.request.update({
      where: { id: requestId },
      data: { 
        formData: updatedFormData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Attachment deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
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
