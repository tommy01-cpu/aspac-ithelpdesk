import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { status, notes, attachmentIds } = body as any;

    const allowed: string[] = ['open', 'on_hold', 'for_approval', 'closed'];
    if (!status || !allowed.includes(String(status))) {
      return NextResponse.json({ error: 'Invalid or unsupported status' }, { status: 400 });
    }

    // Load existing request
    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Do not allow changing to resolved using this endpoint; use /resolve
    if (String(status) === 'resolved') {
      return NextResponse.json({ error: 'Use the resolve endpoint to mark as resolved' }, { status: 400 });
    }

    const currentForm: any = existing.formData || {};
    const updatedForm = {
      ...currentForm,
      lastStatusNotes: notes || currentForm.lastStatusNotes || '',
      lastStatusAttachmentIds: Array.isArray(attachmentIds) ? attachmentIds : (currentForm.lastStatusAttachmentIds || []),
    };

    await prisma.request.update({
      where: { id: requestId },
      data: { status, formData: updatedForm },
    });

    try {
      await addHistory(prisma as any, {
        requestId,
        action: 'Status Change',
        details: `Status changed to ${String(status).replace(/_/g, ' ')}` + (notes ? `\nNotes: ${notes}` : ''),
        actorId: parseInt(session.user.id),
        actorName: session.user.name || 'Technician',
        actorType: 'technician',
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST status error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { RequestStatus } from '@prisma/client';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }

    const { status, notes, attachmentIds } = await request.json();
    const allowed: Array<keyof typeof RequestStatus> = ['open', 'on_hold', 'for_approval', 'resolved', 'closed'] as any;
    if (!status || !allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const actor = await prisma.users.findFirst({ where: { emp_email: session.user.email } });
    if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!actor.isTechnician) return NextResponse.json({ error: 'Only technicians can update status' }, { status: 403 });

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const newStatus = (RequestStatus as any)[status] ?? status;

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        formData: {
          ...(existing.formData as any || {}),
          resolutionNotes: notes || null,
          resolutionAttachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
        }
      }
    });

    try { await prisma.$executeRaw`UPDATE requests SET "updatedAt" = (NOW() AT TIME ZONE 'Asia/Manila') WHERE id = ${requestId}`; } catch {}

    await addHistory(prisma, {
      requestId,
      action: 'Status Change',
      actorId: actor.id,
      actorName: `${actor.emp_fname} ${actor.emp_lname}`,
      actorType: 'technician',
      details: `Status changed from ${existing.status.toString().replace(/_/g, ' ')} to ${String(status).replace(/_/g, ' ')}` + (notes ? `\nNotes : ${notes.replace(/<[^>]*>/g, '').trim()}` : ''),
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (e) {
    console.error('Status update error', e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
