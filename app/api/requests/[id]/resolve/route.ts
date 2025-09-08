import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { notifyRequestResolved } from '@/lib/notifications';

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

    const { fcr = false, closureCode = '', closureComments = '', requestClosureComments = '', attachmentIds = [] } = await request.json().catch(() => ({}));

    console.log('RESOLVE DEBUG - Request payload:', { 
      fcr, 
      closureCode, 
      closureComments: closureComments ? closureComments.substring(0, 100) + '...' : 'empty',
      requestClosureComments: requestClosureComments ? requestClosureComments.substring(0, 100) + '...' : 'empty',
      attachmentIds,
      attachmentIdsType: typeof attachmentIds,
      attachmentIdsIsArray: Array.isArray(attachmentIds),
      attachmentIdsLength: attachmentIds?.length
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
    
    console.log('ATTACHMENT DEBUG - Existing resolution:', existingResolution);
    console.log('ATTACHMENT DEBUG - Existing attachments:', existingAttachments);
    console.log('ATTACHMENT DEBUG - New attachments from request:', newAttachments);
    console.log('ATTACHMENT DEBUG - New attachments type check:', {
      isArray: Array.isArray(attachmentIds),
      length: attachmentIds?.length,
      raw: attachmentIds
    });
    
    // Merge existing and new attachments (avoid duplicates)
    const uniqueAttachments = new Set([...existingAttachments, ...newAttachments]);
    const allAttachments = Array.from(uniqueAttachments);
    console.log('ATTACHMENT DEBUG - All merged attachments:', allAttachments);
    
    const updatedForm = {
      ...(fd || {}),
      resolution: {
        ...(existingResolution || {}),
        fcr: !!fcr,
        closureCode: String(closureCode || ''),
        closureComments: String(closureComments || ''), // Technical resolution notes
        requestClosureComments: String(requestClosureComments || ''), // Request closure comments for requester
        attachments: allAttachments, // Store attachments only in resolution block
        resolvedById: actor.id,
        resolvedBy: `${actor.emp_fname} ${actor.emp_lname}`.trim(),
        resolvedAt: existingResolution.resolvedAt || new Date().toISOString(), // Keep original resolved time if updating
      },
    } as any;

    console.log('Final updated form data (resolution):', JSON.stringify(updatedForm.resolution, null, 2));

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

    // 🎯 PRIORITY: Send resolved email notifications IMMEDIATELY after database update
    // This ensures resolved notifications are sent before any other notifications
    try {
      const statusChanged = existing.status !== 'resolved';
      if (statusChanged) {
        console.log('🔥 PRIORITY: Sending resolved notifications FIRST...');
        
        // Get the complete request data with user information for notifications
        const requestWithUser = await prisma.request.findUnique({
          where: { id: requestId },
          include: {
            user: true,
          },
        });

        if (requestWithUser) {
          // Get template data if available
          const templateData = null; // Template data not needed for notification, but parameter is required
          
          // Use the actual technical resolution notes for the email template, not just the request closure comments
          // The request_resolution field should show the full technical resolution
          const actualResolution = String(closureComments || '').trim();
          const userComments = String(requestClosureComments || '').trim();
          
          // Combine both resolution content and user comments for a complete resolution description
          let resolutionDescription = '';
          if (actualResolution) {
            // Strip HTML from resolution notes for email
            const stripHtml = (html: string) => {
              return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            };
            resolutionDescription = stripHtml(actualResolution);
          }
          
          // If there are additional user comments, append them
          if (userComments) {
            if (resolutionDescription) {
              resolutionDescription += '\n\n' + userComments;
            } else {
              resolutionDescription = userComments;
            }
          }
          
          // Fallback if no resolution content
          if (!resolutionDescription) {
            resolutionDescription = 'Request has been resolved';
          }
          
          await notifyRequestResolved(requestWithUser, templateData, resolutionDescription);
          
          console.log(`✅ PRIORITY: Resolved notifications sent FIRST for request #${requestId}`);
        }
      }
    } catch (error) {
      console.error('Error sending resolved request notifications:', error);
      // Don't fail the request resolution if notifications fail
    }

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
