import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { checkAndGenerateHolidays } from '@/lib/recurring-holidays-service';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('=== HOLIDAY DEBUG CHECK ===');
    
    // 1. Check existing holidays
    const allHolidays = await prisma.holiday.findMany({
      orderBy: {
        date: 'desc'
      }
    });

    // 2. Check recurring holiday templates
    const recurringTemplates = await prisma.holiday.findMany({
      where: {
        isRecurring: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // 3. Check August 21, 2025 specifically
    const aug21Holiday = await prisma.holiday.findFirst({
      where: {
        date: new Date('2025-08-21')
      }
    });

    // 4. Check 2025 holidays
    const holidays2025 = await prisma.holiday.findMany({
      where: {
        date: {
          gte: new Date('2025-01-01'),
          lt: new Date('2026-01-01')
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // 5. Try to generate holidays now
    const generationResult = await checkAndGenerateHolidays();

    return NextResponse.json({
      success: true,
      data: {
        totalHolidays: allHolidays.length,
        recurringTemplates: {
          count: recurringTemplates.length,
          templates: recurringTemplates
        },
        august21Holiday: aug21Holiday,
        holidays2025: {
          count: holidays2025.length,
          holidays: holidays2025
        },
        generationResult,
        allHolidays: allHolidays.slice(0, 20) // Show first 20
      }
    });

  } catch (error) {
    console.error('Error checking holidays:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
