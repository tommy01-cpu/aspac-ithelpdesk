import { NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

// Helper function from sla-calculator.ts to test
function getWorkingMinutesForDay(workingDay: any, operationalHours: any): number {
  // Get working hours for the day
  let startTime: string;
  let endTime: string;

  if (workingDay.scheduleType === 'custom') {
    startTime = workingDay.customStartTime || '08:00';
    endTime = workingDay.customEndTime || '18:00';
  } else {
    startTime = operationalHours.standardStartTime || '08:00';
    endTime = operationalHours.standardEndTime || '18:00';
  }

  // Calculate total working minutes
  const [sh, sm] = startTime.split(':').map((n: string) => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map((n: string) => parseInt(n, 10));
  let minutes = (eh * 60 + em) - (sh * 60 + sm);

  // Subtract breaks
  const breaks = workingDay.breakHours || [];
  for (const b of breaks) {
    const [bsh, bsm] = b.startTime.split(':').map((n: string) => parseInt(n, 10));
    const [beh, bem] = b.endTime.split(':').map((n: string) => parseInt(n, 10));
    minutes -= Math.max(0, (beh * 60 + bem) - (bsh * 60 + bsm));
  }

  return Math.max(0, minutes);
}

export async function GET() {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours found' }, { status: 500 });
    }
    
    // Get working days in order and calculate minutes for each
    const enabledWorkingDays = operationalHours.workingDays
      .filter((day: any) => day.isEnabled && day.scheduleType !== 'not-set')
      .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);

    const dayCalculations = enabledWorkingDays.map((day: any, index: number) => {
      const minutes = getWorkingMinutesForDay(day, operationalHours);
      const hours = minutes / 60;
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        dayOfWeek: day.dayOfWeek,
        dayName: dayNames[day.dayOfWeek],
        scheduleType: day.scheduleType,
        startTime: day.scheduleType === 'custom' ? day.customStartTime : operationalHours.standardStartTime,
        endTime: day.scheduleType === 'custom' ? day.customEndTime : operationalHours.standardEndTime,
        breaks: day.breakHours,
        totalMinutes: minutes,
        totalHours: hours,
        index: index
      };
    });

    // Calculate 4 working days
    let totalMinutes = 0;
    const fourDaysCalculation = [];
    for (let i = 0; i < 4; i++) {
      const workingDay = enabledWorkingDays[i % enabledWorkingDays.length];
      const minutes = getWorkingMinutesForDay(workingDay, operationalHours);
      totalMinutes += minutes;
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      fourDaysCalculation.push({
        sequenceDay: i + 1,
        dayOfWeek: workingDay.dayOfWeek,
        dayName: dayNames[workingDay.dayOfWeek],
        hours: minutes / 60,
        runningTotal: totalMinutes / 60
      });
    }
    
    return NextResponse.json({
      success: true,
      enabledWorkingDays: dayCalculations,
      fourDaysSequence: fourDaysCalculation,
      totalHoursFor4Days: totalMinutes / 60
    });
    
  } catch (error) {
    console.error('Debug calculation error:', error);
    return NextResponse.json({ 
      error: 'Debug calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
