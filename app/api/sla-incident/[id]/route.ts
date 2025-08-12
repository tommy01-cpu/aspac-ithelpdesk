import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define Priority enum locally
enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Top = 'Top'
}

// GET - Fetch single SLA incident by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid SLA incident ID' },
        { status: 400 }
      );
    }

    const incident = await prisma.sLAIncident.findUnique({
      where: { id },
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

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'SLA incident not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend structure
    const transformedIncident = {
      id: incident.id,
      name: incident.name,
      description: incident.description,
      priority: (incident as any).priority,
      responseTime: {
        days: (incident as any).responseDays?.toString() || '',
        hours: (incident as any).responseHours?.toString() || '',
        minutes: (incident as any).responseMinutes?.toString() || '',
      },
      resolutionTime: {
        days: (incident as any).resolutionDays?.toString() || '',
        hours: (incident as any).resolutionHours?.toString() || '',
        minutes: (incident as any).resolutionMinutes?.toString() || '',
      },
      operationalHours: {
        enabled: (incident as any).operationalHoursEnabled || false,
        excludeHolidays: (incident as any).excludeHolidays || false,
        excludeWeekends: (incident as any).excludeWeekends || false,
      },
      responseEscalation: {
        enabled: (incident as any).responseEscalationEnabled || false,
        priority: (incident as any).responseEscalationPriority || '',
      },
      resolutionEscalation: {
        enabled: (incident as any).resolutionEscalationEnabled || false,
        escalateTo: (incident as any).escalateTo ? 
          (Array.isArray((incident as any).escalateTo) ? (incident as any).escalateTo : []) : [],
        escalateType: (incident as any).escalateType || 'after',
        escalateDays: (incident as any).escalateDays?.toString() || '',
        escalateHours: (incident as any).escalateHours?.toString() || '',
        escalateMinutes: (incident as any).escalateMinutes?.toString() || '',
        level2Enabled: (incident as any).level2Enabled || false,
        level2EscalateTo: (incident as any).level2EscalateTo ? 
          (Array.isArray((incident as any).level2EscalateTo) ? (incident as any).level2EscalateTo : []) : [],
        level2EscalateType: 'before', // Default since schema doesn't have this field
        level2EscalateDays: (incident as any).level2Days?.toString() || '',
        level2EscalateHours: (incident as any).level2Hours?.toString() || '',
        level2EscalateMinutes: (incident as any).level2Minutes?.toString() || '',
        level3Enabled: (incident as any).level3Enabled || false,
        level3EscalateTo: (incident as any).level3EscalateTo ? 
          (Array.isArray((incident as any).level3EscalateTo) ? (incident as any).level3EscalateTo : []) : [],
        level3EscalateType: 'before', // Default since schema doesn't have this field
        level3EscalateDays: (incident as any).level3Days?.toString() || '',
        level3EscalateHours: (incident as any).level3Hours?.toString() || '',
        level3EscalateMinutes: (incident as any).level3Minutes?.toString() || '',
        level4Enabled: (incident as any).level4Enabled || false,
        level4EscalateTo: (incident as any).level4EscalateTo ? 
          (Array.isArray((incident as any).level4EscalateTo) ? (incident as any).level4EscalateTo : []) : [],
        level4EscalateType: 'before', // Default since schema doesn't have this field
        level4EscalateDays: (incident as any).level4Days?.toString() || '',
        level4EscalateHours: (incident as any).level4Hours?.toString() || '',
        level4EscalateMinutes: (incident as any).level4Minutes?.toString() || '',
      },
      matchType: (incident as any).matchCriteria || 'all',
      status: incident.status,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      createdBy: incident.creator ? `${incident.creator.emp_fname} ${incident.creator.emp_lname}` : null,
      updatedBy: incident.updater ? `${incident.updater.emp_fname} ${incident.updater.emp_lname}` : null,
    };

    return NextResponse.json({
      success: true,
      data: transformedIncident,
    });
  } catch (error) {
    console.error('Error fetching SLA incident:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SLA incident' },
      { status: 500 }
    );
  }
}

// PUT - Update SLA incident
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid SLA incident ID' },
        { status: 400 }
      );
    }

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

    // Check if incident exists
    const existingIncident = await prisma.sLAIncident.findUnique({
      where: { id },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { success: false, error: 'SLA incident not found' },
        { status: 404 }
      );
    }

    // Update the incident with any type to bypass TypeScript issues temporarily
    const updatedIncident = await (prisma.sLAIncident as any).update({
      where: { id },
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
        
        // Level 2 escalation - map frontend field names to database field names
        level2Enabled: body.resolutionEscalation?.level2Enabled || false,
        level2EscalateTo: body.resolutionEscalation?.level2EscalateTo || null,
        level2Days: parseInt(body.resolutionEscalation?.level2EscalateDays || '0'),
        level2Hours: parseInt(body.resolutionEscalation?.level2EscalateHours || '0'),
        level2Minutes: parseInt(body.resolutionEscalation?.level2EscalateMinutes || '0'),
        
        // Level 3 escalation - map frontend field names to database field names
        level3Enabled: body.resolutionEscalation?.level3Enabled || false,
        level3EscalateTo: body.resolutionEscalation?.level3EscalateTo || null,
        level3Days: parseInt(body.resolutionEscalation?.level3EscalateDays || '0'),
        level3Hours: parseInt(body.resolutionEscalation?.level3EscalateHours || '0'),
        level3Minutes: parseInt(body.resolutionEscalation?.level3EscalateMinutes || '0'),
        
        // Level 4 escalation - map frontend field names to database field names
        level4Enabled: body.resolutionEscalation?.level4Enabled || false,
        level4EscalateTo: body.resolutionEscalation?.level4EscalateTo || null,
        level4Days: parseInt(body.resolutionEscalation?.level4EscalateDays || '0'),
        level4Hours: parseInt(body.resolutionEscalation?.level4EscalateHours || '0'),
        level4Minutes: parseInt(body.resolutionEscalation?.level4EscalateMinutes || '0'),
        
        // System fields
        matchCriteria: body.matchType || 'all',
        updatedBy: body.updatedBy || null,
      },
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

    return NextResponse.json({
      success: true,
      data: updatedIncident,
      message: 'SLA incident updated successfully',
    });
  } catch (error) {
    console.error('Error updating SLA incident:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update SLA incident' },
      { status: 500 }
    );
  }
}

// DELETE - Delete SLA incident
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid SLA incident ID' },
        { status: 400 }
      );
    }

    // Check if incident exists
    const existingIncident = await prisma.sLAIncident.findUnique({
      where: { id },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { success: false, error: 'SLA incident not found' },
        { status: 404 }
      );
    }

    // Delete the incident
    await prisma.sLAIncident.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'SLA incident deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting SLA incident:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete SLA incident' },
      { status: 500 }
    );
  }
}
