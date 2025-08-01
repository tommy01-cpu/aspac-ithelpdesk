import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supportGroups = await prisma.supportGroup.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(supportGroups);
  } catch (error) {
    console.error('Error fetching support groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support groups' },
      { status: 500 }
    );
  }
}
