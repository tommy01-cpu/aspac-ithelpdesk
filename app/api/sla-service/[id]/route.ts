import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Service SLA ID is required' }, { status: 400 });
    }

    // Fetch the service SLA with escalation levels
    const serviceSLA = await prisma.sLAService.findUnique({
      where: { id: parseInt(id) },
      include: {
        escalationLevels: true
      }
    });

    if (!serviceSLA) {
      return NextResponse.json({ error: 'Service SLA not found' }, { status: 404 });
    }

    // Convert the service SLA data to match the frontend format
    const resolutionDays = Math.floor(serviceSLA.resolutionTime / 24);
    const resolutionHours = serviceSLA.resolutionTime % 24;
    
    // Process escalation levels
    const resolutionEscalation = {
      enabled: serviceSLA.autoEscalate || false,
      escalateTo: [], // Level 1 - for backward compatibility
      escalateType: 'before' as 'before' | 'after',
      escalateDays: '',
      escalateHours: '',
      escalateMinutes: '',
      level1EscalateTo: [], // Level 1 - new consistent naming
      level1EscalateType: 'before' as 'before' | 'after',
      level2Enabled: false,
      level2EscalateTo: [],
      level2EscalateType: 'before' as 'before' | 'after',
      level2EscalateDays: '',
      level2EscalateHours: '',
      level2EscalateMinutes: '',
      level3Enabled: false,
      level3EscalateTo: [],
      level3EscalateType: 'before' as 'before' | 'after',
      level3EscalateDays: '',
      level3EscalateHours: '',
      level3EscalateMinutes: '',
      level4Enabled: false,
      level4EscalateTo: [],
      level4EscalateType: 'before' as 'before' | 'after',
      level4EscalateDays: '',
      level4EscalateHours: '',
      level4EscalateMinutes: ''
    };

    // Map escalation levels back to the frontend format
    serviceSLA.escalationLevels.forEach(level => {
      const days = Math.floor(level.timeToEscalate / 24);
      const hours = level.timeToEscalate % 24;
      const escalateTo = (level as any).escalateTo ? JSON.parse((level as any).escalateTo) : [];
      
      if (level.level === 1) {
        // Set both old and new properties for backward compatibility
        resolutionEscalation.escalateTo = escalateTo;
        resolutionEscalation.escalateType = ((level as any).escalateType as 'before' | 'after') || 'before';
        resolutionEscalation.level1EscalateTo = escalateTo;
        resolutionEscalation.level1EscalateType = ((level as any).escalateType as 'before' | 'after') || 'before';
        resolutionEscalation.escalateDays = days.toString();
        resolutionEscalation.escalateHours = hours.toString();
      } else if (level.level === 2) {
        resolutionEscalation.level2Enabled = true;
        resolutionEscalation.level2EscalateTo = escalateTo;
        resolutionEscalation.level2EscalateType = ((level as any).escalateType as 'before' | 'after') || 'before';
        resolutionEscalation.level2EscalateDays = days.toString();
        resolutionEscalation.level2EscalateHours = hours.toString();
      } else if (level.level === 3) {
        resolutionEscalation.level3Enabled = true;
        resolutionEscalation.level3EscalateTo = escalateTo;
        resolutionEscalation.level3EscalateType = ((level as any).escalateType as 'before' | 'after') || 'before';
        resolutionEscalation.level3EscalateDays = days.toString();
        resolutionEscalation.level3EscalateHours = hours.toString();
      } else if (level.level === 4) {
        resolutionEscalation.level4Enabled = true;
        resolutionEscalation.level4EscalateTo = escalateTo;
        resolutionEscalation.level4EscalateType = ((level as any).escalateType as 'before' | 'after') || 'before';
        resolutionEscalation.level4EscalateDays = days.toString();
        resolutionEscalation.level4EscalateHours = hours.toString();
      }
    });

    const responseData = {
      id: serviceSLA.id,
      name: serviceSLA.name,
      description: serviceSLA.description,
      matchType: 'all' as 'all' | 'any', // Default value
      resolutionTime: {
        days: resolutionDays.toString(),
        hours: resolutionHours.toString(),
        minutes: '0'
      },
      operationalHours: {
        enabled: serviceSLA.operationalHours || false,
        excludeHolidays: serviceSLA.excludeHolidays || false,
        excludeWeekends: serviceSLA.excludeWeekends || false
      },
      resolutionEscalation
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Failed to fetch service SLA:', error);
    return NextResponse.json({ error: 'Failed to fetch service SLA' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Service SLA ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      matchType, 
      resolutionTime, 
      operationalHours,
      resolutionEscalation 
    } = body;

    // Validate required fields
    if (!name || !resolutionTime) {
      return NextResponse.json({ error: 'Name and resolution time are required' }, { status: 400 });
    }

    // Convert time values to total hours for compatibility with schema
    const resolutionDays = resolutionTime.days ? parseInt(resolutionTime.days) : 0;
    const resolutionHours = resolutionTime.hours ? parseInt(resolutionTime.hours) : 8;
    const resolutionMinutes = resolutionTime.minutes ? parseInt(resolutionTime.minutes) : 0;
    const totalResolutionTime = (resolutionDays * 24) + resolutionHours + (resolutionMinutes / 60);

    // Update the service SLA
    const serviceSLA = await prisma.sLAService.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || '',
        resolutionTime: Math.ceil(totalResolutionTime),
        operationalHours: operationalHours?.enabled || false,
        excludeHolidays: operationalHours?.excludeHolidays || false,
        excludeWeekends: operationalHours?.excludeWeekends || false,
        autoEscalate: resolutionEscalation?.enabled || false,
        escalationTime: resolutionEscalation?.escalateHours ? parseInt(resolutionEscalation.escalateHours) : 0,
        matchCriteria: matchType || 'ALL',
        // Temporarily remove updatedBy to avoid foreign key constraint issues
      }
    });

    // Delete existing escalation levels and recreate them
    await prisma.sLAServiceEscalation.deleteMany({
      where: { slaServiceId: parseInt(id) }
    });

    // Create escalation levels if enabled
    if (resolutionEscalation?.enabled) {
      const escalationLevels = [];
      
      console.log('UPDATE - Resolution Escalation Data:', {
        enabled: resolutionEscalation.enabled,
        escalateTo: resolutionEscalation.escalateTo,
        level1EscalateTo: resolutionEscalation.level1EscalateTo,
        escalateType: resolutionEscalation.escalateType,
        level1EscalateType: resolutionEscalation.level1EscalateType,
        escalateDays: resolutionEscalation.escalateDays,
        escalateHours: resolutionEscalation.escalateHours
      });
      
      // Level 1 (basic escalation)
      if (resolutionEscalation.escalateHours || resolutionEscalation.escalateDays || 
          (resolutionEscalation.level1EscalateTo && resolutionEscalation.level1EscalateTo.length > 0) ||
          (resolutionEscalation.escalateTo && resolutionEscalation.escalateTo.length > 0)) {
        const level1Time = (parseInt(resolutionEscalation.escalateDays || '0') * 24) + parseInt(resolutionEscalation.escalateHours || '0');
        const level1Data = {
          slaServiceId: parseInt(id),
          level: 1,
          timeToEscalate: level1Time,
          escalationGroup: 'Level 1 Escalation',
          timing: `${resolutionEscalation.escalateDays || 0} days ${resolutionEscalation.escalateHours || 0} hours`,
          escalateType: resolutionEscalation.level1EscalateType || resolutionEscalation.escalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level1EscalateTo || resolutionEscalation.escalateTo || [])
        };
        console.log('UPDATE - Level 1 Escalation Data:', level1Data);
        escalationLevels.push(level1Data);
      }

      // Level 2
      if (resolutionEscalation.level2Enabled) {
        const level2Time = (parseInt(resolutionEscalation.level2EscalateDays || '0') * 24) + parseInt(resolutionEscalation.level2EscalateHours || '0');
        escalationLevels.push({
          slaServiceId: parseInt(id),
          level: 2,
          timeToEscalate: level2Time,
          escalationGroup: 'Level 2 Escalation',
          timing: `${resolutionEscalation.level2EscalateDays || 0} days ${resolutionEscalation.level2EscalateHours || 0} hours`,
          escalateType: resolutionEscalation.level2EscalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level2EscalateTo || [])
        });
      }

      // Level 3
      if (resolutionEscalation.level3Enabled) {
        const level3Time = (parseInt(resolutionEscalation.level3EscalateDays || '0') * 24) + parseInt(resolutionEscalation.level3EscalateHours || '0');
        escalationLevels.push({
          slaServiceId: parseInt(id),
          level: 3,
          timeToEscalate: level3Time,
          escalationGroup: 'Level 3 Escalation',
          timing: `${resolutionEscalation.level3EscalateDays || 0} days ${resolutionEscalation.level3EscalateHours || 0} hours`,
          escalateType: resolutionEscalation.level3EscalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level3EscalateTo || [])
        });
      }

      // Level 4
      if (resolutionEscalation.level4Enabled) {
        const level4Time = (parseInt(resolutionEscalation.level4EscalateDays || '0') * 24) + parseInt(resolutionEscalation.level4EscalateHours || '0');
        escalationLevels.push({
          slaServiceId: parseInt(id),
          level: 4,
          timeToEscalate: level4Time,
          escalationGroup: 'Level 4 Escalation',
          timing: `${resolutionEscalation.level4EscalateDays || 0} days ${resolutionEscalation.level4EscalateHours || 0} hours`,
          escalateType: resolutionEscalation.level4EscalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level4EscalateTo || [])
        });
      }

      // Create all escalation levels
      if (escalationLevels.length > 0) {
        await prisma.sLAServiceEscalation.createMany({
          data: escalationLevels
        });
      }
    }

    return NextResponse.json({ success: true, data: serviceSLA });
  } catch (error) {
    console.error('Failed to update service SLA:', error);
    return NextResponse.json({ error: 'Failed to update service SLA' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Service SLA ID is required' }, { status: 400 });
    }

    // Delete escalation levels first (due to foreign key constraint)
    await prisma.sLAServiceEscalation.deleteMany({
      where: { slaServiceId: parseInt(id) }
    });

    // Delete the service SLA
    await prisma.sLAService.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: 'Service SLA deleted successfully' });
  } catch (error) {
    console.error('Failed to delete service SLA:', error);
    return NextResponse.json({ error: 'Failed to delete service SLA' }, { status: 500 });
  }
}
