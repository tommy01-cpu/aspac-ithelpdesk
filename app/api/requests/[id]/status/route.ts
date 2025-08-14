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

    // Update request status with Philippine time
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        updatedAt: philippineTime,
        formData: {
          ...(existing.formData as any || {}),
          resolutionNotes: notes || null,
          resolutionAttachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
        }
      }
    });

    // Add history entry with Philippine time (using new Prisma create method)
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