import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/templates - Get templates with pagination and search
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'service' or 'incident'

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (type) {
      where.type = type;
    }

    // Get total count
    const total = await prisma.template.count({ where });

    // Get templates
    const templates = await prisma.template.findMany({
      where,
      skip,
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
        slaService: {
          select: {
            id: true,
            name: true,
          },
        },
        supportGroups: {
          include: {
            supportGroup: {
              select: {
                id: true,
                name: true,
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
      orderBy: { createdAt: 'desc' },
    });

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      name, 
      description, 
      icon,
      type, 
      categoryId,
      fields, 
      approvalWorkflow,
      slaServiceId,
      supportGroups 
    } = await req.json();

    if (!name || !type || !fields) {
      return NextResponse.json(
        { error: 'Name, type, and fields are required' },
        { status: 400 }
      );
    }

    // Check if template with same name already exists
    const existingTemplate = await prisma.template.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        type: type,
        isActive: true
      },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      );
    }

    // Create template in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the template
      const template = await tx.template.create({
        data: {
          name,
          description,
          icon,
          type,
          categoryId: categoryId || null,
          fields,
          approvalWorkflow,
          slaServiceId: slaServiceId || null,
          createdBy: parseInt(session.user.id),
          updatedBy: parseInt(session.user.id),
        },
      });

      // Create support group assignments if provided
      if (supportGroups && supportGroups.length > 0) {
        await tx.templateSupportGroup.createMany({
          data: supportGroups.map((sg: any) => ({
            templateId: template.id,
            supportGroupId: sg.supportGroupId,
            isActive: sg.isActive,
            loadBalanceType: sg.loadBalanceType,
            priority: sg.priority,
          })),
        });
      }

      // Automatically create a ServiceCatalogItem for service templates
      if (type === 'service' && categoryId) {
        await tx.serviceCatalogItem.create({
          data: {
            name: name,
            description: description || `Service template: ${name}`,
            categoryId: categoryId,
            templateId: template.id,
            isActive: true,
            createdBy: parseInt(session.user.id),
            updatedBy: parseInt(session.user.id),
          },
        });
      }

      return template;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates - Update template
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      id,
      name, 
      description, 
      icon,
      type, 
      fields, 
      approvalWorkflow,
      slaServiceId,
      supportGroups 
    } = await req.json();

    if (!id || !name || !type || !fields) {
      return NextResponse.json(
        { error: 'ID, name, type, and fields are required' },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // When editing a template, we allow keeping the same name
    // No duplicate name check needed for updates

    // Update template in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the template
      const template = await tx.template.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          icon,
          type,
          fields,
          approvalWorkflow,
          slaServiceId: slaServiceId || null,
          updatedBy: parseInt(session.user.id),
        },
      });

      // Delete existing support group assignments
      await tx.templateSupportGroup.deleteMany({
        where: { templateId: parseInt(id) },
      });

      // Create new support group assignments if provided
      if (supportGroups && supportGroups.length > 0) {
        await tx.templateSupportGroup.createMany({
          data: supportGroups.map((sg: any) => ({
            templateId: template.id,
            supportGroupId: sg.supportGroupId,
            isActive: sg.isActive,
            loadBalanceType: sg.loadBalanceType,
            priority: sg.priority,
          })),
        });
      }

      // Update corresponding ServiceCatalogItem if it exists for service templates
      if (type === 'service') {
        const existingCatalogItem = await tx.serviceCatalogItem.findFirst({
          where: { templateId: parseInt(id) },
        });

        if (existingCatalogItem) {
          await tx.serviceCatalogItem.update({
            where: { id: existingCatalogItem.id },
            data: {
              name: name,
              description: description || `Service template: ${name}`,
              updatedBy: parseInt(session.user.id),
            },
          });
        }
      }

      return template;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates - Delete template
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: {
        serviceCatalogItems: true,
        incidentCatalogItems: true,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is being used
    const isInUse = existingTemplate.serviceCatalogItems.length > 0 || 
                    existingTemplate.incidentCatalogItems.length > 0;

    if (isInUse) {
      // Soft delete - mark as inactive
      const template = await prisma.template.update({
        where: { id: parseInt(id) },
        data: {
          isActive: false,
          updatedBy: parseInt(session.user.id),
        },
      });

      return NextResponse.json({
        ...template,
        message: 'Template deactivated (in use by catalog items)',
      });
    } else {
      // Hard delete - completely remove
      await prisma.$transaction(async (tx) => {
        const templateId = parseInt(id);
        
        // 1. Delete support group assignments
        await tx.templateSupportGroup.deleteMany({
          where: { templateId },
        });

        // 2. Delete associated SLA service and its escalations if they exist
        if (existingTemplate.slaServiceId) {
          // Delete SLA escalation levels first
          await tx.sLAServiceEscalation.deleteMany({
            where: { slaServiceId: existingTemplate.slaServiceId },
          });
          
          // Delete the SLA service
          await tx.sLAService.delete({
            where: { id: existingTemplate.slaServiceId },
          });
        }

        // 3. Delete service catalog items that use this template
        await tx.serviceCatalogItem.deleteMany({
          where: { templateId },
        });

        // 4. Delete incident catalog items that use this template
        await tx.incidentCatalogItem.deleteMany({
          where: { templateId },
        });

        // 5. Finally, delete the template
        await tx.template.delete({
          where: { id: templateId },
        });
      });

      return NextResponse.json({
        message: 'Template and all associated data deleted successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
