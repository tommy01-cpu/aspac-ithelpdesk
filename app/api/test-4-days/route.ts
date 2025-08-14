import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours, componentsToWorkingHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    console.log('=== Testing 4 Working Days Calculation ===');
    
    // Get operational hours
    const oh = await getOperationalHours();
    
    if (!oh) {
      return NextResponse.json({ error: 'No operational hours configuration found' }, { status: 500 });
    }
    
    // Calculate 4 working days using our new function
    const fourWorkingDays = componentsToWorkingHours(4, 0, 0, oh);
    
    // Test calculation from Wednesday 7:13 PM
    const testStart = new Date('2025-01-15T19:13:00+08:00');
    const dueDate = await calculateSLADueDate(testStart, fourWorkingDays, { useOperationalHours: true });
    
    return NextResponse.json({
      success: true,
      test: '4 Working Days Calculation',
      input: {
        days: 4,
        hours: 0,
        minutes: 0
      },
      calculation: {
        workingHours: fourWorkingDays,
        description: `4 working days = ${fourWorkingDays} working hours`,
        useOperationalHours: true
      },
      result: {
        startTime: {
          iso: testStart.toISOString(),
          philippine: testStart.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: testStart.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
        },
        dueDate: {
          iso: dueDate.toISOString(),
          philippine: dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
        }
      },
      expected: 'Tuesday 1:00 PM Philippine time',
      correct: dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }).includes('Tuesday') && 
               dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }).includes('1:00')
    });
    
  } catch (error) {
    console.error('Error in 4 working days test:', error);
    return NextResponse.json(
      { 
        error: '4 working days test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
