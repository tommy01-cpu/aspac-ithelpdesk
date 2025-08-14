import { NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    // Test the SLA calculation with the scenario from the user
    const ticketCreatedDate = new Date('2025-08-12T18:55:00.000Z'); // 6:55 PM Philippine time
    const slaHours = 36; // 4 working days × 9 hours per day
    
    console.log('Testing SLA calculation:');
    console.log('Ticket created:', ticketCreatedDate.toISOString());
    console.log('Ticket created (Philippine):', ticketCreatedDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const operationalHours = await getOperationalHours();
    console.log('Operational hours found:', !!operationalHours);
    
    const dueDate = await calculateSLADueDate(ticketCreatedDate, slaHours);
    
    console.log('Calculated due date:', dueDate.toISOString());
    console.log('Calculated due date (Philippine):', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Manual verification
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDay = new Date(ticketCreatedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' });
    const endDay = new Date(dueDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' });
    
    return NextResponse.json({
      success: true,
      ticketCreated: {
        iso: ticketCreatedDate.toISOString(),
        philippine: ticketCreatedDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
        day: startDay
      },
      dueDate: {
        iso: dueDate.toISOString(),
        philippine: dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
        day: endDay
      },
      slaHours,
      calculation: {
        description: "4 working days (36 hours) from Wednesday 6:55 PM",
        expectedLogic: [
          "Start: Wednesday 6:55 PM (outside working hours)",
          "Next working time: Thursday 8:00 AM",
          "Thursday 8AM-6PM (9hrs) - Remaining: 27hrs",
          "Friday 8AM-6PM (9hrs) - Remaining: 18hrs", 
          "Saturday 8AM-12PM (4hrs) - Remaining: 14hrs",
          "Monday 8AM-6PM (9hrs) - Remaining: 5hrs",
          "Tuesday 8AM-1PM (5hrs) - Complete"
        ],
        expectedDueDate: "Tuesday 1:00 PM Philippine time"
      }
    });
    
  } catch (error) {
    console.error('SLA test error:', error);
    return NextResponse.json({ 
      error: 'SLA calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
