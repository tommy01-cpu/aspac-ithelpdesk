import { NextResponse } from 'next/server';
import { componentsToWorkingHours, getOperationalHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours found' }, { status: 500 });
    }
    
    // Test 4 working days conversion
    const workingHours = componentsToWorkingHours(4, 0, 0, operationalHours);
    
    return NextResponse.json({
      success: true,
      input: {
        days: 4,
        hours: 0,
        minutes: 0
      },
      output: {
        totalWorkingHours: workingHours
      },
      operationalHours: {
        workingTimeType: operationalHours.workingTimeType,
        workingDays: operationalHours.workingDays.map(day => ({
          dayOfWeek: day.dayOfWeek,
          isEnabled: day.isEnabled,
          scheduleType: day.scheduleType,
          customStartTime: day.customStartTime,
          customEndTime: day.customEndTime,
          breakHours: day.breakHours
        }))
      }
    });
    
  } catch (error) {
    console.error('Components test error:', error);
    return NextResponse.json({ 
      error: 'Components test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
