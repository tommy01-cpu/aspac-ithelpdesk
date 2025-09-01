import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/holidays/fix-recurring - Fix existing generated holidays to be recurring
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Fixing existing generated holidays to be recurring...');
    
    // Find all holidays that look like they were auto-generated (have year suffix in description or are duplicates)
    const allHolidays = await prisma.holiday.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { name: 'asc' },
        { date: 'asc' }
      ]
    });

    // Group by name to identify duplicates (which are likely auto-generated)
    const holidayGroups = new Map<string, any[]>();
    
    for (const holiday of allHolidays) {
      if (!holidayGroups.has(holiday.name)) {
        holidayGroups.set(holiday.name, []);
      }
      holidayGroups.get(holiday.name)!.push(holiday);
    }

    let updatedCount = 0;
    const updates = [];

    // For each group with multiple entries, mark them all as recurring
    for (const [name, holidays] of Array.from(holidayGroups.entries())) {
      if (holidays.length > 1) {
        console.log(`🔄 Found ${holidays.length} instances of "${name}" - marking all as recurring`);
        
        for (const holiday of holidays) {
          if (!holiday.isRecurring) {
            updates.push({
              id: holiday.id,
              name: holiday.name,
              date: holiday.date.toDateString(),
              currentRecurring: holiday.isRecurring
            });
            
            // Update to be recurring
            await prisma.holiday.update({
              where: { id: holiday.id },
              data: { 
                isRecurring: true,
                // Clean up description if it has year suffix
                description: holiday.description?.replace(/\s*\(\d{4}\)$/, '') || holiday.description
              }
            });
            
            updatedCount++;
          }
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} holidays to be recurring`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${updatedCount} holidays to be recurring`,
      updates: updates,
      totalHolidays: allHolidays.length,
      holidayGroups: Object.fromEntries(
        Array.from(holidayGroups.entries()).map(([name, holidays]) => [
          name, 
          holidays.map(h => ({
            date: h.date.toDateString(),
            isRecurring: h.isRecurring,
            description: h.description
          }))
        ])
      )
    });
    
  } catch (error) {
    console.error('❌ Error fixing recurring holidays:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fix recurring holidays',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/holidays/fix-recurring - Force update all holidays to be recurring (more aggressive)
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FORCE: Setting ALL holidays to be recurring...');
    
    const result = await prisma.holiday.updateMany({
      where: {
        isActive: true
      },
      data: {
        isRecurring: true
      }
    });

    console.log(`✅ Force updated ${result.count} holidays to be recurring`);
    
    return NextResponse.json({
      success: true,
      message: `Force updated ${result.count} holidays to be recurring`,
      updatedCount: result.count
    });
    
  } catch (error) {
    console.error('❌ Error force updating holidays:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to force update holidays',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
