export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

// This endpoint closes requests that have been in 'resolved' for >= 10 days.
// Intended to be triggered by an external scheduler (e.g., OS task, cron-like runner).
export async function POST() {
  try {
    // Compute cutoff timestamp in DB (Asia/Manila) using NOW AT TIME ZONE rather than client time
    // Fetch candidates in resolved with resolvedAt in formData older than 10 days
    const candidates = await prisma.request.findMany({
      where: { status: 'resolved' },
      select: { id: true, formData: true },
    });

    const toClose: number[] = [];
    const nowMs = Date.now();
    for (const r of candidates) {
      const fd: any = r.formData || {};
      const resAt = fd?.resolution?.resolvedAt;
      if (!resAt) continue;
      const ageMs = nowMs - new Date(resAt).getTime();
      if (ageMs >= 10 * 24 * 60 * 60 * 1000) {
        toClose.push(r.id);
      }
    }

    for (const id of toClose) {
      // Create Philippine time for closedDate
      const now = new Date();
      const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const closedDate = philippineTime.toISOString().slice(0, 19).replace('T', ' ');

      // Get current formData and add closedDate
      const currentRequest = await prisma.request.findUnique({
        where: { id },
        select: { formData: true }
      });
      
      const updatedFormData = {
        ...(currentRequest?.formData as any || {}),
        closedDate: closedDate
      };

      await prisma.request.update({ 
        where: { id }, 
        data: { 
          status: 'closed',
          formData: updatedFormData
        } 
      });
      try {
        await addHistory(prisma as any, {
          requestId: id,
          action: 'Closed',
          details: 'Auto-closed by system after 10 days from resolution.',
          actorType: 'system',
          actorName: 'System',
        });
      } catch {}
    }

    return NextResponse.json({ success: true, closed: toClose.length });
  } catch (error) {
    console.error('Auto-close error:', error);
    return NextResponse.json({ error: 'Failed to auto-close requests' }, { status: 500 });
  }
}
