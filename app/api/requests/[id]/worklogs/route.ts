import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

// GET: list work logs for a request (tech only)
export async function GET(
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

    const req = await prisma.request.findUnique({ where: { id: requestId } });
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const formData: any = (req.formData || {});
    const worklogs = Array.isArray(formData.worklogs) ? formData.worklogs : [];

    return NextResponse.json({ success: true, worklogs });
  } catch (error) {
    console.error('GET worklogs error:', error);
    return NextResponse.json({ error: 'Failed to fetch work logs' }, { status: 500 });
  }
}

// POST: create a new work log entry
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

    const body = await request.json();
    // Optional: override owner to a selected technician
    let reqOwnerId: number | null = null;
    if (body.ownerId != null && String(body.ownerId).trim() !== '') {
      const parsed = parseInt(String(body.ownerId));
      if (!isNaN(parsed)) {
        // Validate target owner is an active technician
        const ownerUser = await prisma.users.findFirst({
          where: {
            id: parsed,
            emp_status: 'active',
            technician: { isActive: true }
          },
          select: { id: true, emp_fname: true, emp_lname: true, emp_email: true }
        });
        if (!ownerUser) {
          return NextResponse.json({ error: 'Invalid ownerId: not an active technician' }, { status: 400 });
        }
        reqOwnerId = ownerUser.id;
      }
    }
    const nowIso = new Date().toISOString();
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Compute time if both start and end are provided
    let timeTakenMinutes = Number(body.timeTakenMinutes) || 0;
    if (body.startTime && body.endTime) {
      const diff = Math.max(0, new Date(body.endTime).getTime() - new Date(body.startTime).getTime());
      timeTakenMinutes = Math.floor(diff / 60000);
    }

    // Resolve final owner (selected tech or current session)
    let finalOwnerId = reqOwnerId ?? parseInt(session.user.id);
    let finalOwnerName = session.user.name || 'Technician';
    if (reqOwnerId != null) {
      const ownerUser = await prisma.users.findUnique({ where: { id: reqOwnerId }, select: { emp_fname: true, emp_lname: true, emp_email: true } });
      if (ownerUser) {
        finalOwnerName = `${(ownerUser.emp_fname || '').trim()} ${(ownerUser.emp_lname || '').trim()}`.trim() || (ownerUser.emp_email || 'Technician');
      }
    }

    const newLog = {
      id,
      ownerId: finalOwnerId,
      ownerName: finalOwnerName,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      timeTakenMinutes,
      includeNonOperational: !!body.includeNonOperational,
      description: body.description || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Load existing logs
    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const currentForm: any = existing.formData || {};
    const worklogs = Array.isArray(currentForm.worklogs) ? currentForm.worklogs : [];
    worklogs.push(newLog);

    // Save back to request
    await prisma.request.update({
      where: { id: requestId },
      data: { formData: { ...(currentForm || {}), worklogs } }
    });

    // Add history entry
    try {
      await addHistory(prisma, {
        requestId,
        action: 'WorkLog Added',
        actorId: parseInt(session.user.id),
        actorName: session.user.name || 'Technician',
        actorType: 'technician',
        details: `Owner: ${newLog.ownerName}\nTime Taken: ${(newLog.timeTakenMinutes / 60 >> 0).toString().padStart(2,'0')} hr ${(newLog.timeTakenMinutes % 60).toString().padStart(2,'0')} min`,
      });
    } catch (e) {
      console.warn('Failed to write worklog history entry:', e);
    }

    return NextResponse.json({ success: true, worklog: newLog });
  } catch (error) {
    console.error('POST worklogs error:', error);
    return NextResponse.json({ error: 'Failed to add work log' }, { status: 500 });
  }
}

// PUT: update an existing work log entry by id
export async function PUT(
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

    const body = await request.json();
  const { id, ownerId } = body as any;
    if (!id) {
      return NextResponse.json({ error: 'Missing worklog id' }, { status: 400 });
    }

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const currentForm: any = existing.formData || {};
    const worklogs: any[] = Array.isArray(currentForm.worklogs) ? currentForm.worklogs : [];
    const idx = worklogs.findIndex(w => w.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    // Optionally change owner to a selected technician
    let updatedOwnerId = worklogs[idx].ownerId;
    let updatedOwnerName = worklogs[idx].ownerName;
    if (ownerId != null && String(ownerId).trim() !== '') {
      const parsed = parseInt(String(ownerId));
      if (!isNaN(parsed)) {
        const ownerUser = await prisma.users.findFirst({
          where: {
            id: parsed,
            emp_status: 'active',
            technician: { isActive: true }
          },
          select: { id: true, emp_fname: true, emp_lname: true, emp_email: true }
        });
        if (!ownerUser) {
          return NextResponse.json({ error: 'Invalid ownerId: not an active technician' }, { status: 400 });
        }
        updatedOwnerId = ownerUser.id;
        updatedOwnerName = `${(ownerUser.emp_fname || '').trim()} ${(ownerUser.emp_lname || '').trim()}`.trim() || (ownerUser.emp_email || 'Technician');
      }
    }

    // Compute updated time if both start and end given
    let updatedMinutes = typeof body.timeTakenMinutes === 'number' ? body.timeTakenMinutes : worklogs[idx].timeTakenMinutes;
    if (body.startTime && body.endTime) {
      const diff = Math.max(0, new Date(body.endTime).getTime() - new Date(body.startTime).getTime());
      updatedMinutes = Math.floor(diff / 60000);
    }

    const updated = {
      ...worklogs[idx],
      ownerId: updatedOwnerId,
      ownerName: updatedOwnerName,
      startTime: body.startTime ?? worklogs[idx].startTime,
      endTime: body.endTime ?? worklogs[idx].endTime,
      timeTakenMinutes: updatedMinutes,
      includeNonOperational: typeof body.includeNonOperational === 'boolean' ? body.includeNonOperational : worklogs[idx].includeNonOperational,
      description: body.description ?? worklogs[idx].description,
      updatedAt: new Date().toISOString(),
    };
    worklogs[idx] = updated;

    await prisma.request.update({
      where: { id: requestId },
      data: { formData: { ...(currentForm || {}), worklogs } }
    });

    return NextResponse.json({ success: true, worklog: updated });
  } catch (error) {
    console.error('PUT worklogs error:', error);
    return NextResponse.json({ error: 'Failed to update work log' }, { status: 500 });
  }
}

// DELETE: remove a work log entry by id
export async function DELETE(
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
    const { id } = body as any;
    if (!id) {
      return NextResponse.json({ error: 'Missing worklog id' }, { status: 400 });
    }

    const existing = await prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const currentForm: any = existing.formData || {};
    const worklogs: any[] = Array.isArray(currentForm.worklogs) ? currentForm.worklogs : [];
    const idx = worklogs.findIndex(w => w.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }
    const removed = worklogs.splice(idx, 1)[0];

    await prisma.request.update({
      where: { id: requestId },
      data: { formData: { ...(currentForm || {}), worklogs } }
    });

    try {
      await addHistory(prisma as any, {
        requestId,
        action: 'WorkLog Deleted',
        actorId: parseInt(session.user.id),
        actorName: session.user.name || 'Technician',
        actorType: 'technician',
        details: `Owner: ${removed?.ownerName || ''}`,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE worklogs error:', error);
    return NextResponse.json({ error: 'Failed to delete work log' }, { status: 500 });
  }
}
