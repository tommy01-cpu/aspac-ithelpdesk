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

    // Identify acting technician
    const actor = await prisma.users.findFirst({ where: { emp_email: session.user.email } });
    if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!actor.isTechnician) return NextResponse.json({ error: 'Only technicians can resolve requests' }, { status: 403 });

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (existing.status === 'closed') return NextResponse.json({ error: 'Request is already closed' }, { status: 400 });

    // Basic validations (keep lightweight here; UI enforces more). Do not require requester acknowledgement.
    const fd: any = existing.formData || {};
    const missing: string[] = [];
    if (!closureComments || String(closureComments).trim().length === 0) missing.push('Resolution');
    if (!fd.assignedTechnician && !fd.assignedTechnicianId) missing.push('Technician');
    if (missing.length) return NextResponse.json({ error: 'Missing mandatory fields', details: missing }, { status: 400 });

    // Persist resolution metadata nested under formData.resolution
    const updatedForm = {
      ...(fd || {}),
      resolution: {
        ...(fd.resolution || {}),
        fcr: !!fcr,
        closureCode: String(closureCode || ''),
        closureComments: String(closureComments || ''),
        attachments: Array.isArray(attachmentIds) ? attachmentIds : [],
        resolvedById: actor.id,
        resolvedBy: `${actor.emp_fname} ${actor.emp_lname}`.trim(),
        resolvedAt: new Date().toISOString(),
      },
    } as any;

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { status: 'resolved', formData: updatedForm },
    });

    // Force Asia/Manila timestamp for updatedAt
    try {
      await prisma.$executeRaw`UPDATE requests SET "updatedAt" = (NOW() AT TIME ZONE 'Asia/Manila') WHERE id = ${requestId}`;
    } catch {}

    // History entry
    try {
      await addHistory(prisma as any, {
        requestId,
        action: 'Resolved',
        actorId: actor.id,
        actorName: `${actor.emp_fname} ${actor.emp_lname}`.trim(),
        actorType: 'technician',
        details:
          `Closure Code: ${closureCode || 'N/A'}` +
          (closureComments ? `\nResolution: ${closureComments}` : '') +
          `\nStatus changed to Resolved` +
          (fcr ? `\nFirst Call Resolution: YES` : ''),
      });
    } catch {}

    return NextResponse.json({ ok: true, request: updated });
  } catch (e) {
    console.error('Resolve error', e);
    return NextResponse.json({ error: 'Failed to resolve request' }, { status: 500 });
  }
}
