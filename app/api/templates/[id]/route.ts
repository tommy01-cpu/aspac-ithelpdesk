import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/templates/[id] - Get specific template by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateId = parseInt(params.id);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    const template = await prisma.template.findUnique({
      where: { 
        id: templateId
        // Remove isActive filter to allow loading inactive templates for editing
      },
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
        slaService: {
          select: {
            id: true,
            name: true,
            description: true,
            responseTime: true,
            resolutionDays: true,
            resolutionHours: true,
            resolutionMinutes: true,
            priority: true,
          },
        },
        supportGroups: {
          include: {
            supportGroup: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        serviceCatalogItems: {
          select: {
            id: true,
            name: true,
          },
        },
        incidentCatalogItems: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
