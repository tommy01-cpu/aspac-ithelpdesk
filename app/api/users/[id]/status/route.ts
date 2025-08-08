import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json();
    const userId = Number(params.id);
    if (!userId || (status !== 'active' && status !== 'inactive')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const user = await prisma.users.update({
      where: { id: userId },
      data: { emp_status: status }, // Use actual field name from schema
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}
