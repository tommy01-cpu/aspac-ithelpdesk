import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define Priority enum locally since it might not be exported
enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Top = 'Top'
}

// GET - Fetch all SLA incidents with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const total = await prisma.sLAIncident.count({ where });

    // Fetch incidents with relationships
    const incidents = await prisma.sLAIncident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
        updater: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
      },
    });

    // Transform the data to match your frontend structure
    const transformedIncidents = incidents.map((incident: any) => ({
      id: incident.id,
      name: incident.name,
      description: incident.description,
      priority: incident.priority,
      responseTime: formatTime(incident.responseDays || 0, incident.responseHours || 0, incident.responseMinutes || 0),
      resolutionTime: {
        days: incident.resolutionDays || 0,
        hours: incident.resolutionHours || 0,
        minutes: incident.resolutionMinutes || 0,
        formatted: formatTime(incident.resolutionDays || 0, incident.resolutionHours || 0, incident.resolutionMinutes || 0)
      },
      status: incident.status,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      createdBy: incident.creator ? `${incident.creator.emp_fname} ${incident.creator.emp_lname}` : null,
      updatedBy: incident.updater ? `${incident.updater.emp_fname} ${incident.updater.emp_lname}` : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        incidents: transformedIncidents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching SLA incidents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SLA incidents' },
      { status: 500 }
    );
  }
}

// POST - Create new SLA incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.priority) {
      return NextResponse.json(
        { success: false, error: 'Name and priority are required' },
        { status: 400 }
      );
    }

    // Validate priority enum
    if (!Object.values(Priority).includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    // Create the incident with any type to bypass TypeScript issues temporarily
    const incident = await (prisma.sLAIncident as any).create({
      data: {
        name: body.name,
        description: body.description || null,
        priority: body.priority,
        
        // Resolution time
        resolutionDays: parseInt(body.resolutionTime?.days || '0'),
        resolutionHours: parseInt(body.resolutionTime?.hours || '8'),
        resolutionMinutes: parseInt(body.resolutionTime?.minutes || '0'),
        
        // Response time (for future use)
        responseDays: parseInt(body.responseTime?.days || '0'),
        responseHours: parseInt(body.responseTime?.hours || '2'),
        responseMinutes: parseInt(body.responseTime?.minutes || '0'),
        
        // Operational hours
        operationalHoursEnabled: body.operationalHours?.enabled || false,
        excludeHolidays: body.operationalHours?.excludeHolidays || false,
        excludeWeekends: body.operationalHours?.excludeWeekends || false,
        
        // Response escalation (for future use)
        responseEscalationEnabled: body.responseEscalation?.enabled || false,
        responseEscalationPriority: body.responseEscalation?.priority || null,
        
        // Resolution escalation
        resolutionEscalationEnabled: body.resolutionEscalation?.enabled || false,
        escalateTo: body.resolutionEscalation?.escalateTo || null,
        escalateType: body.resolutionEscalation?.escalateType || null,
        escalateDays: parseInt(body.resolutionEscalation?.escalateDays || '0'),
        escalateHours: parseInt(body.resolutionEscalation?.escalateHours || '0'),
        escalateMinutes: parseInt(body.resolutionEscalation?.escalateMinutes || '0'),
        
        // Level 2 escalation - using correct schema field names
        level2Enabled: body.resolutionEscalation?.level2Enabled || false,
        level2EscalateTo: body.resolutionEscalation?.level2EscalateTo || null,
        level2Days: parseInt(body.resolutionEscalation?.level2EscalateDays || '0'),
        level2Hours: parseInt(body.resolutionEscalation?.level2EscalateHours || '0'),
        level2Minutes: parseInt(body.resolutionEscalation?.level2EscalateMinutes || '0'),
        
        // Level 3 escalation - using correct schema field names
        level3Enabled: body.resolutionEscalation?.level3Enabled || false,
        level3EscalateTo: body.resolutionEscalation?.level3EscalateTo || null,
        level3Days: parseInt(body.resolutionEscalation?.level3EscalateDays || '0'),
        level3Hours: parseInt(body.resolutionEscalation?.level3EscalateHours || '0'),
        level3Minutes: parseInt(body.resolutionEscalation?.level3EscalateMinutes || '0'),
        
        // Level 4 escalation - using correct schema field names
        level4Enabled: body.resolutionEscalation?.level4Enabled || false,
        level4EscalateTo: body.resolutionEscalation?.level4EscalateTo || null,
        level4Days: parseInt(body.resolutionEscalation?.level4EscalateDays || '0'),
        level4Hours: parseInt(body.resolutionEscalation?.level4EscalateHours || '0'),
        level4Minutes: parseInt(body.resolutionEscalation?.level4EscalateMinutes || '0'),
        
        // System fields
        matchCriteria: body.matchType || 'all',
        createdBy: body.createdBy || null,
      },
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: incident,
      message: 'SLA incident created successfully',
    });
  } catch (error) {
    console.error('Error creating SLA incident:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create SLA incident' },
      { status: 500 }
    );
  }
}

// Helper function to format time display
function formatTime(days: number, hours: number, minutes: number): string {
  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' ') : 'Not set';
}
