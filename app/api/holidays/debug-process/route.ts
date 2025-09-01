import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yearStart = new Date(currentYear, 0, 1); // January 1st of current year
    
    console.log(`📅 Debug: Checking holidays from ${yearStart.toDateString()} to ${todayDate.toDateString()}...`);
    
    // Get all recurring holidays for this year (from January 1 to today)
    const recurringHolidays = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
        isActive: true,
        date: {
          gte: yearStart,     // From January 1st of current year
          lte: todayDate      // Until today (inclusive)
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const nextYear = currentYear + 1;
    
    // For each holiday, check what would happen
    const processResults = [];
    
    for (const holiday of recurringHolidays) {
      const holidayDate = new Date(holiday.date);
      const originalMonth = holidayDate.getMonth();
      const originalDay = holidayDate.getDate();
      const nextYearHoliday = new Date(nextYear, originalMonth, originalDay);
      
      // Check if next year's holiday already exists
      const existingNextYearHoliday = await prisma.holiday.findFirst({
        where: {
          name: holiday.name,
          date: {
            gte: new Date(nextYear, 0, 1),
            lt: new Date(nextYear + 1, 0, 1)
          }
        }
      });

      processResults.push({
        currentHoliday: {
          id: holiday.id,
          name: holiday.name,
          date: holiday.date.toISOString().split('T')[0],
          dateFormatted: holidayDate.toDateString()
        },
        nextYearDate: nextYearHoliday.toDateString(),
        nextYearExists: !!existingNextYearHoliday,
        existingNextYear: existingNextYearHoliday ? {
          id: existingNextYearHoliday.id,
          date: existingNextYearHoliday.date.toISOString().split('T')[0]
        } : null,
        wouldCreate: !existingNextYearHoliday
      });
    }

    return NextResponse.json({
      success: true,
      dateRange: {
        from: yearStart.toDateString(),
        to: todayDate.toDateString()
      },
      currentYear,
      nextYear,
      foundHolidays: recurringHolidays.length,
      processResults
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
