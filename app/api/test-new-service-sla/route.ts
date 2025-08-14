import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours, componentsToWorkingHours } from '@/lib/sla-calculator';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('=== Testing New Service SLA System ===');
    
    // Test with a real service SLA (like "Request a New Computer")
    const template = await prisma.template.findFirst({
      where: { 
        type: 'service',
        slaServiceId: { not: null }
      },
      include: {
        slaService: {
          select: {
            id: true,
            name: true,
            resolutionDays: true,
            resolutionHours: true,
            resolutionMinutes: true,
            operationalHours: true,
          },
        },
      },
    });
    
    if (!template?.slaService) {
      return NextResponse.json({ error: 'No service template with SLA found' });
    }
    
    const slaService = template.slaService;
    const days = slaService.resolutionDays ?? 0;
    const hours = slaService.resolutionHours ?? 0;
    const minutes = slaService.resolutionMinutes ?? 0;
    
    let slaHours: number;
    let useOperationalHours: boolean;
    
    // Apply the same logic as in the route
    if (slaService.operationalHours) {
      const oh = await getOperationalHours();
      if (oh && oh.workingTimeType !== 'round-clock') {
        slaHours = componentsToWorkingHours(days, hours, minutes, oh);
        useOperationalHours = true;
      } else {
        slaHours = (days * 24) + hours + (minutes / 60);
        useOperationalHours = false;
      }
    } else {
      slaHours = (days * 24) + hours + (minutes / 60);
      useOperationalHours = false;
    }
    
    // Test calculation from Wednesday 7:13 PM
    const testStart = new Date('2025-01-15T19:13:00+08:00');
    const dueDate = await calculateSLADueDate(testStart, slaHours, { useOperationalHours });
    
    return NextResponse.json({
      success: true,
      test: 'New Service SLA System',
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      slaService: {
        id: slaService.id,
        name: slaService.name,
        breakdown: {
          days: slaService.resolutionDays,
          hours: slaService.resolutionHours,
          minutes: slaService.resolutionMinutes
        },
        operationalHours: slaService.operationalHours
      },
      calculation: {
        input: `${days}d ${hours}h ${minutes}m`,
        convertedHours: slaHours,
        useOperationalHours,
        description: useOperationalHours ? 'Working hours calculation' : 'Calendar hours calculation'
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
      }
    });
    
  } catch (error) {
    console.error('Error in new service SLA test:', error);
    return NextResponse.json(
      { 
        error: 'New service SLA test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
