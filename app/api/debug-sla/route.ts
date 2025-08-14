import { NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours found' });
    }
    
    // Helper function to get working hours for a specific day
    const getWorkingHoursForDay = (dayOfWeek: number): number => {
      const workingDay = operationalHours.workingDays.find(
        (day) => day.dayOfWeek === dayOfWeek
      );

      if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
        return 0;
      }

      let startTime: string;
      let endTime: string;

      if (workingDay.scheduleType === 'custom') {
        startTime = workingDay.customStartTime || '08:00';
        endTime = workingDay.customEndTime || '18:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
        endTime = operationalHours.standardEndTime || '18:00';
      }

      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
      let minutes = (eh * 60 + em) - (sh * 60 + sm);

      // Subtract breaks
      const breaks = workingDay.breakHours || [];
      for (const b of breaks) {
        const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
        const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
        minutes -= Math.max(0, (beh * 60 + bem) - (bsh * 60 + bsm));
      }

      return Math.max(0, minutes) / 60;
    };
    
    // Manual step-by-step calculation
    const startDate = new Date('2025-08-12T18:55:00.000Z'); // 6:55 PM Philippine time (Actually Wednesday evening)
    let remainingHours = 36;
    
    const steps = [];
    
    // Wednesday: Ticket created at 6:55 PM (outside working hours)
    steps.push({
      day: 'Wednesday',
      date: '2025-08-13',
      note: 'Ticket created at 6:55 PM (outside working hours)',
      hoursUsed: 0,
      remainingHours: remainingHours
    });
    
    // Thursday: 8 AM - 6 PM (with lunch break) = 9 hours
    const thursdayHours = getWorkingHoursForDay(4); // Thursday = 4
    steps.push({
      day: 'Thursday',
      date: '2025-08-14', 
      note: `Full working day: ${thursdayHours} hours`,
      hoursUsed: thursdayHours,
      remainingHours: remainingHours - thursdayHours
    });
    remainingHours -= thursdayHours;
    
    // Friday: 8 AM - 6 PM (with lunch break) = 9 hours
    const fridayHours = getWorkingHoursForDay(5); // Friday = 5
    steps.push({
      day: 'Friday',
      date: '2025-08-15',
      note: `Full working day: ${fridayHours} hours`,
      hoursUsed: fridayHours,
      remainingHours: remainingHours - fridayHours
    });
    remainingHours -= fridayHours;
    
    // Saturday: 8 AM - 12 PM = 4 hours
    const saturdayHours = getWorkingHoursForDay(6); // Saturday = 6
    steps.push({
      day: 'Saturday', 
      date: '2025-08-16',
      note: `Half working day: ${saturdayHours} hours`,
      hoursUsed: saturdayHours,
      remainingHours: remainingHours - saturdayHours
    });
    remainingHours -= saturdayHours;
    
    // Sunday: Not a working day
    steps.push({
      day: 'Sunday',
      date: '2025-08-17',
      note: 'Not a working day',
      hoursUsed: 0,
      remainingHours: remainingHours
    });
    
    // Monday: 8 AM - 6 PM (with lunch break) = 9 hours
    const mondayHours = getWorkingHoursForDay(1); // Monday = 1
    if (remainingHours <= mondayHours) {
      steps.push({
        day: 'Monday',
        date: '2025-08-18',
        note: `Partial working day: ${remainingHours} hours of ${mondayHours} available`,
        hoursUsed: remainingHours,
        remainingHours: 0
      });
    } else {
      steps.push({
        day: 'Monday',
        date: '2025-08-18',
        note: `Full working day: ${mondayHours} hours`,
        hoursUsed: mondayHours,
        remainingHours: remainingHours - mondayHours
      });
      remainingHours -= mondayHours;
      
      // Tuesday: Continue if needed
      const tuesdayHours = getWorkingHoursForDay(2); // Tuesday = 2
      steps.push({
        day: 'Tuesday',
        date: '2025-08-19',
        note: `Partial working day: ${remainingHours} hours of ${tuesdayHours} available`,
        hoursUsed: remainingHours,
        remainingHours: 0
      });
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        startTime: startDate.toISOString(),
        totalSLAHours: 36,
        workingHoursPerDay: {
          Monday: getWorkingHoursForDay(1),
          Tuesday: getWorkingHoursForDay(2), 
          Wednesday: getWorkingHoursForDay(3),
          Thursday: getWorkingHoursForDay(4),
          Friday: getWorkingHoursForDay(5),
          Saturday: getWorkingHoursForDay(6),
          Sunday: getWorkingHoursForDay(0)
        },
        stepByStep: steps
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
