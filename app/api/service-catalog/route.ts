import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/service-catalog - Get service catalog items with pagination and search
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
    const categoryId = searchParams.get('categoryId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // Get total count
    const total = await prisma.serviceCatalogItem.count({ where });

    // Get service catalog items
    const serviceCatalogItems = await prisma.serviceCatalogItem.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            icon: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pages = Math.ceil(total / limit);

    // Get request counts for each template
    const templateIds = serviceCatalogItems
      .filter(item => item.templateId)
      .map(item => String(item.templateId!));

    const requestCounts = templateIds.length > 0 ? await prisma.request.groupBy({
      by: ['templateId'],
      where: {
        templateId: {
          in: templateIds
        }
      },
      _count: {
        id: true
      }
    }) : [];

    // Create a map of templateId to request count
    const requestCountMap = requestCounts.reduce((acc, item) => {
      acc[item.templateId] = item._count?.id || 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      services: serviceCatalogItems.map(item => ({
        ...item,
        categoryName: item.category.name,
        templateName: item.template?.name || null,
        template_icon: item.template?.icon || null,
        requestCount: item.templateId ? (requestCountMap[String(item.templateId)] || 0) : 0,
      })),
      serviceCatalogItems: serviceCatalogItems.map(item => ({
        ...item,
        categoryName: item.category.name,
        templateName: item.template?.name || null,
        template_icon: item.template?.icon || null,
        requestCount: item.templateId ? (requestCountMap[String(item.templateId)] || 0) : 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching service catalog items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service catalog items' },
      { status: 500 }
    );
  }
}

// POST /api/service-catalog - Create new service catalog item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, categoryId, templateId, isActive } = await req.json();

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Check if service catalog item with same name already exists
    const existingItem = await prisma.serviceCatalogItem.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'A service catalog item with this name already exists' },
        { status: 400 }
      );
    }

    const serviceCatalogItem = await prisma.serviceCatalogItem.create({
      data: {
        name,
        description,
        categoryId,
        templateId: templateId || null,
        isActive: isActive ?? true,
        createdBy: parseInt(session.user.id),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
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
      ...serviceCatalogItem,
      categoryName: serviceCatalogItem.category.name,
      templateName: serviceCatalogItem.template?.name || null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating service catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to create service catalog item' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-catalog - Delete service catalog item
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
        { error: 'Service catalog item ID is required' },
        { status: 400 }
      );
    }

    // Check if service catalog item exists
    const existingItem = await prisma.serviceCatalogItem.findUnique({
      where: { id: parseInt(id) },
      include: {
        template: true, // Include template to check if it exists
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Service catalog item not found' },
        { status: 404 }
      );
    }

    // Check if the template is being used by active requests
    if (existingItem.templateId) {
      const activeRequests = await prisma.request.count({
        where: {
          templateId: existingItem.templateId.toString(),
          status: {
            in: ['open', 'in_progress', 'pending_approval', 'waiting_for_approval']
          }
        }
      });

      if (activeRequests > 0) {
        return NextResponse.json(
          { 
            error: `Cannot delete service catalog item. There are ${activeRequests} active request(s) using this template.`,
            activeRequests: activeRequests
          },
          { status: 409 }
        );
      }

      // Check for any requests at all (for additional warning)
      const totalRequests = await prisma.request.count({
        where: {
          templateId: existingItem.templateId.toString()
        }
      });

      if (totalRequests > 0) {
        // Allow deletion but provide warning in response
        console.warn(`Deleting service catalog item with ${totalRequests} historical requests`);
      }
    }

    // Delete in a transaction to ensure both service and template are deleted together
    await prisma.$transaction(async (tx) => {
      // Delete the service catalog item first
      await tx.serviceCatalogItem.delete({
        where: { id: parseInt(id) },
      });

      // If there's an associated template, delete it too
      if (existingItem.templateId) {
        // First delete support group assignments for the template
        await tx.templateSupportGroup.deleteMany({
          where: { templateId: existingItem.templateId },
        });

        // Check if template has SLA service and delete it
        const template = await tx.template.findUnique({
          where: { id: existingItem.templateId },
          select: { slaServiceId: true },
        });

        if (template?.slaServiceId) {
          // Delete SLA escalation levels first
          await tx.sLAServiceEscalation.deleteMany({
            where: { slaServiceId: template.slaServiceId },
          });
          
          // Delete the SLA service
          await tx.sLAService.delete({
            where: { id: template.slaServiceId },
          });
        }

        // Finally, delete the template
        await tx.template.delete({
          where: { id: existingItem.templateId },
        });
      }
    });

    return NextResponse.json(
      { message: 'Service catalog item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to delete service catalog item' },
      { status: 500 }
    );
  }
}
