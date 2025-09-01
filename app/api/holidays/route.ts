import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/holidays - Get all holidays
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [holidays, total] = await Promise.all([
      prisma.holiday.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.holiday.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      holidays,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/holidays - Create new holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date, description, isRecurring, isActive } = body;

    // Validate required fields
    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        description,
        isRecurring: isRecurring ?? false, // Use nullish coalescing to preserve explicit false
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      message: 'Holiday created successfully',
      holiday,
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
