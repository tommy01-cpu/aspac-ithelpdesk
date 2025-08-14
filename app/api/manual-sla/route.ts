import { NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours found' });
    }
    
    // Manual SLA calculation step by step
    const startTime = new Date('2025-08-12T18:55:00.000Z'); // Wed 6:55 PM Philippine time
    let totalSLAHours = 36;
    
    console.log('=== Manual SLA Calculation ===');
    console.log('Start:', startTime.toISOString());
    console.log('Philippine time:', startTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Helper to get working hours for a day
    const getWorkingHoursForDay = (dayOfWeek: number): number => {
      const workingDay = operationalHours.workingDays.find(d => d.dayOfWeek === dayOfWeek);
      if (!workingDay || !workingDay.isEnabled) return 0;
      
      const start = workingDay.scheduleType === 'custom' 
        ? (workingDay.customStartTime || '08:00')
        : (operationalHours.standardStartTime || '08:00');
      const end = workingDay.scheduleType === 'custom'
        ? (workingDay.customEndTime || '18:00') 
        : (operationalHours.standardEndTime || '18:00');
        
      const [sh, sm] = start.split(':').map(n => parseInt(n, 10));
      const [eh, em] = end.split(':').map(n => parseInt(n, 10));
      let minutes = (eh * 60 + em) - (sh * 60 + sm);
      
      // Subtract breaks
      (workingDay.breakHours || []).forEach(b => {
        const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
        const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
        minutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
      });
      
      return minutes / 60;
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Step by step calculation
    let currentDate = new Date('2025-08-14T00:00:00.000Z'); // Thursday 8 AM Philippine (start counting)
    let remainingHours = totalSLAHours;
    const steps = [];
    
    // Thursday
    const thurHours = getWorkingHoursForDay(4);
    steps.push(`Thursday: ${thurHours} hours available, using ${Math.min(remainingHours, thurHours)} hours`);
    remainingHours -= Math.min(remainingHours, thurHours);
    
    // Friday  
    if (remainingHours > 0) {
      const friHours = getWorkingHoursForDay(5);
      steps.push(`Friday: ${friHours} hours available, using ${Math.min(remainingHours, friHours)} hours`);
      remainingHours -= Math.min(remainingHours, friHours);
    }
    
    // Saturday
    if (remainingHours > 0) {
      const satHours = getWorkingHoursForDay(6);
      steps.push(`Saturday: ${satHours} hours available, using ${Math.min(remainingHours, satHours)} hours`);
      remainingHours -= Math.min(remainingHours, satHours);
    }
    
    // Sunday (not working)
    if (remainingHours > 0) {
      steps.push(`Sunday: 0 hours (non-working day)`);
    }
    
    // Monday
    if (remainingHours > 0) {
      const monHours = getWorkingHoursForDay(1);
      steps.push(`Monday: ${monHours} hours available, using ${Math.min(remainingHours, monHours)} hours`);
      remainingHours -= Math.min(remainingHours, monHours);
    }
    
    // Tuesday
    if (remainingHours > 0) {
      const tueHours = getWorkingHoursForDay(2);
      steps.push(`Tuesday: ${tueHours} hours available, using ${Math.min(remainingHours, tueHours)} hours`);
      remainingHours -= Math.min(remainingHours, tueHours);
    }
    
    // Calculate exact due time
    // We need 5 hours on Tuesday (8 AM + 5 hours = 1 PM)
    const finalDay = new Date('2025-08-19T00:00:00.000Z'); // Tuesday in UTC 
    // Add 8 hours to get 8 AM Philippine, then add 5 more hours = 1 PM Philippine
    const finalTime = new Date(finalDay.getTime() + (8 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000)); // 1 PM Philippine
    
    return NextResponse.json({
      success: true,
      manualCalculation: {
        startTime: startTime.toISOString(),
        totalSLAHours,
        steps,
        remainingAfterAllDays: remainingHours,
        expectedDueDate: {
          iso: finalTime.toISOString(),
          philippine: finalTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: finalTime.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' })
        },
        workingHours: {
          Monday: getWorkingHoursForDay(1),
          Tuesday: getWorkingHoursForDay(2),
          Wednesday: getWorkingHoursForDay(3), 
          Thursday: getWorkingHoursForDay(4),
          Friday: getWorkingHoursForDay(5),
          Saturday: getWorkingHoursForDay(6),
          Sunday: getWorkingHoursForDay(0)
        }
      }
    });
    
  } catch (error) {
    console.error('Manual calculation error:', error);
    return NextResponse.json({ 
      error: 'Manual calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
