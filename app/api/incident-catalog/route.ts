import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/incident-catalog - Get incident catalog items with pagination and search
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
    const total = await prisma.incidentCatalogItem.count({ where });

    // Get incident catalog items
    const incidentCatalogItems = await prisma.incidentCatalogItem.findMany({
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
            type: true,
            icon: true,
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
    const templateIds = incidentCatalogItems
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
      incidentCatalogItems: incidentCatalogItems.map(item => ({
        ...item,
        categoryName: item.category.name,
        templateName: item.template?.name || null,
        requestCount: item.templateId ? (requestCountMap[String(item.templateId)] || 0) : 0,
        usageCount: item.templateId ? (requestCountMap[String(item.templateId)] || 0) : 0, // Also add as usageCount for compatibility
      })),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching incident catalog items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident catalog items' },
      { status: 500 }
    );
  }
}

// POST /api/incident-catalog - Create new incident catalog item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, categoryId, templateId, priority, isActive } = await req.json();

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['Low', 'Medium', 'High', 'Top'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    // Check if incident catalog item with same name already exists
    const existingItem = await prisma.incidentCatalogItem.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'An incident catalog item with this name already exists' },
        { status: 400 }
      );
    }

    const incidentCatalogItem = await prisma.incidentCatalogItem.create({
      data: {
        name,
        description,
        categoryId,
        templateId: templateId || null,
        priority: priority || 'Medium',
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
            icon: true,
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
      ...incidentCatalogItem,
      categoryName: incidentCatalogItem.category.name,
      templateName: incidentCatalogItem.template?.name || null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating incident catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to create incident catalog item' },
      { status: 500 }
    );
  }
}

// DELETE /api/incident-catalog - Delete incident catalog item
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get('id');

    if (!incidentId) {
      return NextResponse.json(
        { error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    const incidentIdInt = parseInt(incidentId);

    // Check if incident catalog item exists
    const incidentCatalogItem = await prisma.incidentCatalogItem.findUnique({
      where: { id: incidentIdInt },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!incidentCatalogItem) {
      return NextResponse.json(
        { error: 'Incident catalog item not found' },
        { status: 404 }
      );
    }

    // Check if there are any requests using this template - block deletion if any exist
    if (incidentCatalogItem.templateId) {
      const totalRequests = await prisma.request.count({
        where: {
          templateId: String(incidentCatalogItem.templateId)
        }
      });

      if (totalRequests > 0) {
        return NextResponse.json(
          { error: `Cannot delete incident "${incidentCatalogItem.name}" because it has ${totalRequests} request(s) associated with it. Deletion is not allowed once a template has been used.` },
          { status: 409 }
        );
      }

      // Delete the associated template if it exists (only reached if no requests exist)
      try {
        await prisma.template.delete({
          where: { id: incidentCatalogItem.templateId }
        });
      } catch (error) {
        console.error('Error deleting template:', error);
        // Continue with incident deletion even if template deletion fails
      }
    }

    // Delete the incident catalog item
    await prisma.incidentCatalogItem.delete({
      where: { id: incidentIdInt }
    });

    return NextResponse.json(
      { message: 'Incident catalog item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting incident catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to delete incident catalog item' },
      { status: 500 }
    );
  }
}
