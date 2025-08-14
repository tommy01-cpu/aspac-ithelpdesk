import { NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours found' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      operationalHours: {
        workingTimeType: operationalHours.workingTimeType,
        standardStartTime: operationalHours.standardStartTime,
        standardEndTime: operationalHours.standardEndTime,
        standardBreakStart: operationalHours.standardBreakStart,
        standardBreakEnd: operationalHours.standardBreakEnd,
        workingDays: operationalHours.workingDays.map(day => ({
          dayOfWeek: day.dayOfWeek,
          isEnabled: day.isEnabled,
          scheduleType: day.scheduleType,
          customStartTime: day.customStartTime,
          customEndTime: day.customEndTime,
          breakHours: day.breakHours.map(b => ({
            startTime: b.startTime,
            endTime: b.endTime
          }))
        }))
      }
    });
    
  } catch (error) {
    console.error('Operational hours test error:', error);
    return NextResponse.json({ 
      error: 'Operational hours test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
