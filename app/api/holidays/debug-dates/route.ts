import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`📅 Debug holiday dates for ${todayDate.toDateString()}...`);
    
    // Get all holidays with "Test Recurring Holiday" in the name
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

    const debugInfo = testHolidays.map(holiday => {
      const holidayDate = new Date(holiday.date);
      const holidayDateOnly = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
      
      return {
        id: holiday.id,
        name: holiday.name,
        originalDate: holiday.date.toISOString(),
        dateOnly: holidayDateOnly.toDateString(),
        year: holidayDate.getFullYear(),
        month: holidayDate.getMonth(),
        day: holidayDate.getDate(),
        isRecurring: holiday.isRecurring,
        matchesToday: holidayDateOnly.getTime() === todayDate.getTime()
      };
    });

    // Also test date creation logic
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    
    // Test what happens when we create a date for Sept 1
    const testSept1_2025 = new Date(2025, 8, 1); // Month is 0-indexed, so 8 = September
    const testSept1_2026 = new Date(2026, 8, 1);
    
    return NextResponse.json({
      success: true,
      today: todayDate.toDateString(),
      todayTime: todayDate.getTime(),
      currentYear,
      nextYear,
      testHolidays: debugInfo,
      dateTests: {
        sept1_2025: {
          date: testSept1_2025.toDateString(),
          year: testSept1_2025.getFullYear(),
          month: testSept1_2025.getMonth(),
          day: testSept1_2025.getDate()
        },
        sept1_2026: {
          date: testSept1_2026.toDateString(),
          year: testSept1_2026.getFullYear(),
          month: testSept1_2026.getMonth(),
          day: testSept1_2026.getDate()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
