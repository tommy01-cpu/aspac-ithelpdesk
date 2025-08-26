import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

// Resolve moves a request to "resolved" (not "closed"). Closing is separate (manual or auto-close).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = Number(params.id);
    if (!Number.isFinite(requestId)) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }

    const { fcr = false, closureCode = '', closureComments = '', attachmentIds = [] } = await request.json().catch(() => ({}));

    console.log('RESOLVE DEBUG - Request payload:', { 
      fcr, 
      closureCode, 
      closureComments: closureComments ? closureComments.substring(0, 100) + '...' : 'empty', 
      attachmentIds 
    });

    // Check if user is technician from session (which is based on technicians table)
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Only technicians can resolve requests' }, { status: 403 });
    }

    // Get user details for resolution metadata
    const actor = await prisma.users.findFirst({ where: { emp_email: session.user.email } });
    if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (existing.status === 'closed') return NextResponse.json({ error: 'Request is already closed' }, { status: 400 });

    // Basic validations (keep lightweight here; UI enforces more). Do not require requester acknowledgement.
    const fd: any = existing.formData || {};
    const missing: string[] = [];
    if (!closureComments || String(closureComments).trim().length === 0) missing.push('Resolution');
    
    // Only check for assigned technician if the request is not already resolved
    // (for resolved requests, we just want to update the resolution content)
    if (existing.status !== 'resolved' && !fd.assignedTechnician && !fd.assignedTechnicianId) {
      missing.push('Technician');
    }
    
    if (missing.length) return NextResponse.json({ error: 'Missing mandatory fields', details: missing }, { status: 400 });

    // Persist resolution metadata nested under formData.resolution
    const existingResolution = fd.resolution || {};
    const existingAttachments = Array.isArray(existingResolution.attachments) ? existingResolution.attachments : [];
    const newAttachments = Array.isArray(attachmentIds) ? attachmentIds : [];
    
    console.log('Existing attachments:', existingAttachments);
    console.log('New attachments:', newAttachments);
    
    // Merge existing and new attachments (avoid duplicates)
    const allAttachments = [...new Set([...existingAttachments, ...newAttachments])];
    console.log('Merged attachments:', allAttachments);
    
    const updatedForm = {
      ...(fd || {}),
      resolution: {
        ...(existingResolution || {}),
        fcr: !!fcr,
        closureCode: String(closureCode || ''),
        closureComments: String(closureComments || ''),
        attachments: allAttachments,
        resolvedById: actor.id,
        resolvedBy: `${actor.emp_fname} ${actor.emp_lname}`.trim(),
        resolvedAt: existingResolution.resolvedAt || new Date().toISOString(), // Keep original resolved time if updating
      },
    } as any;

    console.log('Final updated form data:', JSON.stringify(updatedForm.resolution, null, 2));

    // Update to resolved status (or keep as resolved if already resolved)
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { 
        status: 'resolved', 
        formData: updatedForm,
        updatedAt: philippineTime,
      },
    });

    // History entry (only if status changed or resolution was updated)
    try {
      const statusChanged = existing.status !== 'resolved';
      const historyAction = statusChanged ? 'Resolved' : 'Resolution Updated';
      
      // Get attachment names for all resolution attachments (existing + new)
      let attachmentDetails = '';
      if (allAttachments.length > 0) {
        try {
          const { prismaAttachments } = require('@/lib/prisma-attachments');
          const attachmentRecords = await prismaAttachments.attachment.findMany({
            where: { id: { in: allAttachments } },
            select: { originalName: true }
          });
          const attachmentNames = attachmentRecords.map((att: any) => att.originalName);
          if (attachmentNames.length > 0) {
            attachmentDetails = `\nAttachments: ${attachmentNames.join(', ')}`;
          }
        } catch (e) {
          console.error('Error fetching attachment names for history:', e);
        }
      }
      
      // Create resolution preview (strip HTML and truncate)
      const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      };
      
      const resolutionPreview = closureComments ? stripHtml(String(closureComments)) : '';
      const truncatedResolution = resolutionPreview.length > 200 
        ? resolutionPreview.substring(0, 200) + '...' 
        : resolutionPreview;
      
      let historyDetails = '';
      if (statusChanged) {
        historyDetails = 'Request resolved';
        if (closureCode && closureCode.trim()) {
          historyDetails += `\nClosure Code: ${closureCode}`;
        }
        if (truncatedResolution) {
          historyDetails += `\nResolution: ${truncatedResolution}`;
        }
        historyDetails += attachmentDetails;
      } else {
        // For updates, show the resolution content if it exists
        historyDetails = 'Resolution updated';
        if (closureCode && closureCode.trim()) {
          historyDetails += `\nClosure Code: ${closureCode}`;
        }
        if (truncatedResolution) {
          historyDetails += `\nResolution: ${truncatedResolution}`;
        }
        if (attachmentDetails) {
          historyDetails += attachmentDetails;
        }
        if (!truncatedResolution && !attachmentDetails && (!closureCode || !closureCode.trim())) {
          historyDetails = 'Resolution content updated';
        }
      }
      
      await addHistory(prisma as any, {
        requestId,
        action: historyAction,
        actorId: actor.id,
        actorName: `${actor.emp_fname} ${actor.emp_lname}`.trim(),
        actorType: 'technician',
        details: historyDetails,
      });
    } catch {}

    return NextResponse.json({ ok: true, request: updated });
  } catch (e) {
    console.error('Resolve error', e);
    return NextResponse.json({ error: 'Failed to resolve request' }, { status: 500 });
  }
}
