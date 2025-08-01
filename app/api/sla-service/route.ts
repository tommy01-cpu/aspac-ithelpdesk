import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSLAs = await prisma.sLAService.findMany({
      include: {
        escalationLevels: true,
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: serviceSLAs });
  } catch (error) {
    console.error('Failed to fetch service SLAs:', error);
    return NextResponse.json({ error: 'Failed to fetch service SLAs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      matchType, 
      criteria = [], 
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

    // Create the service SLA without priority (since this is service SLA)
    const serviceSLA = await prisma.sLAService.create({
      data: {
        name,
        description: description || '',
        priority: 'Medium', // Default value since schema requires it
        category: null, // Remove category field as requested
        responseTime: 2, // Default response time
        resolutionTime: Math.ceil(totalResolutionTime), // Convert to hours
        operationalHours: operationalHours?.enabled || false,
        excludeHolidays: operationalHours?.excludeHolidays || false,
        excludeWeekends: operationalHours?.excludeWeekends || false,
        autoEscalate: resolutionEscalation?.enabled || false,
        escalationTime: resolutionEscalation?.escalateHours ? parseInt(resolutionEscalation.escalateHours) : 0,
        matchCriteria: matchType || 'ALL',
        // Temporarily remove createdBy to avoid foreign key constraint issues
      }
    });

    // Create escalation levels if enabled
    if (resolutionEscalation?.enabled) {
      const escalationLevels = [];
      
      console.log('CREATE - Resolution Escalation Data:', {
        enabled: resolutionEscalation.enabled,
        escalateTo: resolutionEscalation.escalateTo,
        level1EscalateTo: resolutionEscalation.level1EscalateTo,
        escalateType: resolutionEscalation.escalateType,
        level1EscalateType: resolutionEscalation.level1EscalateType,
        escalateDays: resolutionEscalation.escalateDays,
        escalateHours: resolutionEscalation.escalateHours
      });
      
      // Level 1 (basic escalation) - resolution time
      if (resolutionEscalation.escalateHours || resolutionEscalation.escalateDays || 
          (resolutionEscalation.level1EscalateTo && resolutionEscalation.level1EscalateTo.length > 0) ||
          (resolutionEscalation.escalateTo && resolutionEscalation.escalateTo.length > 0)) {
        const level1ResolutionTime = (parseInt(resolutionEscalation.escalateDays || '0') * 24) + parseInt(resolutionEscalation.escalateHours || '0');
        const level1Data = {
          slaServiceId: serviceSLA.id,
          level: 1,
          timeToEscalate: level1ResolutionTime,
          escalationGroup: 'Level 1 Escalation',
          timing: `${resolutionEscalation.escalateDays || 0} days ${resolutionEscalation.escalateHours || 0} hours`,
          escalateType: resolutionEscalation.level1EscalateType || resolutionEscalation.escalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level1EscalateTo || resolutionEscalation.escalateTo || [])
        };
        console.log('CREATE - Level 1 Escalation Data:', level1Data);
        escalationLevels.push(level1Data);
      }

      // Level 2 - only escalate timing (when to escalate TO level 2)
      if (resolutionEscalation.level2Enabled) {
        // Escalate timing - when to escalate TO this level
        const level2EscalateTime = (parseInt(resolutionEscalation.level2EscalateDays || '0') * 24) + 
                                   parseInt(resolutionEscalation.level2EscalateHours || '0') + 
                                   (parseInt(resolutionEscalation.level2EscalateMinutes || '0') / 60);
        
        escalationLevels.push({
          slaServiceId: serviceSLA.id,
          level: 2,
          timeToEscalate: level2EscalateTime,
          escalationGroup: 'Level 2 Escalation',
          timing: `Escalate: ${resolutionEscalation.level2EscalateDays || 0}d ${resolutionEscalation.level2EscalateHours || 0}h ${resolutionEscalation.level2EscalateMinutes || 0}m`,
          escalateType: resolutionEscalation.level2EscalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level2EscalateTo || [])
        });
      }

      // Level 3 - only escalate timing
      if (resolutionEscalation.level3Enabled) {
        const level3EscalateTime = (parseInt(resolutionEscalation.level3EscalateDays || '0') * 24) + 
                                   parseInt(resolutionEscalation.level3EscalateHours || '0') + 
                                   (parseInt(resolutionEscalation.level3EscalateMinutes || '0') / 60);
        
        escalationLevels.push({
          slaServiceId: serviceSLA.id,
          level: 3,
          timeToEscalate: level3EscalateTime,
          escalationGroup: 'Level 3 Escalation',
          timing: `Escalate: ${resolutionEscalation.level3EscalateDays || 0}d ${resolutionEscalation.level3EscalateHours || 0}h ${resolutionEscalation.level3EscalateMinutes || 0}m`,
          escalateType: resolutionEscalation.level3EscalateType || 'before',
          escalateTo: JSON.stringify(resolutionEscalation.level3EscalateTo || [])
        });
      }

      // Level 4 - only escalate timing
      if (resolutionEscalation.level4Enabled) {
        const level4EscalateTime = (parseInt(resolutionEscalation.level4EscalateDays || '0') * 24) + 
                                   parseInt(resolutionEscalation.level4EscalateHours || '0') + 
                                   (parseInt(resolutionEscalation.level4EscalateMinutes || '0') / 60);
        
        escalationLevels.push({
          slaServiceId: serviceSLA.id,
          level: 4,
          timeToEscalate: level4EscalateTime,
          escalationGroup: 'Level 4 Escalation',
          timing: `Escalate: ${resolutionEscalation.level4EscalateDays || 0}d ${resolutionEscalation.level4EscalateHours || 0}h ${resolutionEscalation.level4EscalateMinutes || 0}m`,
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
    console.error('Failed to create service SLA:', error);
    return NextResponse.json({ error: 'Failed to create service SLA' }, { status: 500 });
  }
}
