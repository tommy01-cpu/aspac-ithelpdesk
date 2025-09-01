import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const testHolidays = await prisma.holiday.findMany({
      where: {
        name: {
          contains: 'Test Recurring Holiday'
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const formattedHolidays = testHolidays.map(holiday => ({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date.toISOString().split('T')[0], // YYYY-MM-DD format
      dateFormatted: holiday.date.toDateString(),
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive
    }));

    return NextResponse.json({
      success: true,
      count: testHolidays.length,
      holidays: formattedHolidays
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
