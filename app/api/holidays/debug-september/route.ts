import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test the exact logic used in checkAndGenerateHolidays
    const currentYear = 2025;
    const nextYear = 2026;
    
    // Check if next year's holiday already exists for "Test Recurring Holiday 2"
    const existingNextYearHoliday = await prisma.holiday.findFirst({
      where: {
        name: "Test Recurring Holiday 2",
        date: {
          gte: new Date(nextYear, 0, 1, 0, 0, 0, 0), // January 1st of next year
          lt: new Date(nextYear + 1, 0, 1, 0, 0, 0, 0) // January 1st of year after next
        }
      }
    });
    
    // Also check specific September 1, 2026 date
    const sep1_2026_check = await prisma.holiday.findFirst({
      where: {
        name: "Test Recurring Holiday 2",
        date: new Date(2026, 8, 1, 0, 0, 0, 0) // September 1, 2026
      }
    });
    
    // Check what holidays exist for this name
    const allWithThisName = await prisma.holiday.findMany({
      where: {
        name: "Test Recurring Holiday 2"
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    return NextResponse.json({
      success: true,
      searchCriteria: {
        name: "Test Recurring Holiday 2",
        yearRange: `${nextYear}-01-01 to ${nextYear + 1}-01-01`,
        nextYear,
        currentYear
      },
      existingNextYearHoliday: existingNextYearHoliday ? {
        id: existingNextYearHoliday.id,
        name: existingNextYearHoliday.name,
        date: existingNextYearHoliday.date.toISOString(),
        dateFormatted: existingNextYearHoliday.date.toDateString()
      } : null,
      sep1_2026_check: sep1_2026_check ? {
        id: sep1_2026_check.id,
        name: sep1_2026_check.name,
        date: sep1_2026_check.date.toISOString(),
        dateFormatted: sep1_2026_check.date.toDateString()
      } : null,
      allWithThisName: allWithThisName.map(h => ({
        id: h.id,
        name: h.name,
        date: h.date.toISOString(),
        dateFormatted: h.date.toDateString(),
        year: h.date.getFullYear()
      }))
    });
    
  } catch (error) {
    console.error('Debug september error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Actually create the missing September 1, 2026 holiday
    // Fix timezone issue by using explicit date creation
    const sep1_2026 = new Date('2026-09-01T00:00:00.000Z'); // Explicit UTC date
    const newHoliday = await prisma.holiday.create({
      data: {
        name: "Test Recurring Holiday 2",
        date: sep1_2026,
        description: "Test Recurring Holiday (Manual creation for 2026)",
        isRecurring: true,
        isActive: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Created September 1, 2026 holiday manually",
      created: {
        id: newHoliday.id,
        name: newHoliday.name,
        date: newHoliday.date.toISOString(),
        dateFormatted: newHoliday.date.toDateString()
      }
    });
    
  } catch (error) {
    console.error('Create september error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
