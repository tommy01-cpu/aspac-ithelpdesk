import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);
    
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Get template with SLA information
    const template = await prisma.template.findUnique({
      where: {
        id: templateId
      },
      include: {
        slaService: {
          select: {
            id: true,
            name: true,
            description: true,
            priority: true,
            responseTime: true,
            resolutionTime: true,
            operationalHours: true,
            excludeHolidays: true,
            excludeWeekends: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // For incident templates, we need to get SLA based on priority
    if (template.type === 'incident') {
      // We'll need to check priority-based SLA during form submission
      // For now, return template info with a note that SLA depends on priority
      return NextResponse.json({
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
          description: template.description
        },
        sla: null,
        note: 'SLA will be determined based on selected priority'
      });
    }

    // For service templates, return the associated SLA
    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        description: template.description
      },
      sla: template.slaService
    });

  } catch (error) {
    console.error('Error fetching template SLA:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template SLA information' },
      { status: 500 }
    );
  }
}
