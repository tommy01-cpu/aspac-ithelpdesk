import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get all available SLA services for template assignment
export async function GET() {
  try {
    const slaServices = await prisma.sLAService.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        description: true,
        priority: true,
        category: true,
        responseTime: true,
        resolutionTime: true,
        operationalHours: true,
        autoEscalate: true,
        escalationTime: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      slaServices: slaServices
    });

  } catch (error) {
    console.error('Error fetching SLA services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
