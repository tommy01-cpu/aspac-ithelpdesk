import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// using shared prisma client

// GET /api/service-categories - Fetch service categories with pagination and search
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'service' or 'incident'
    const skip = (page - 1) * limit;

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.serviceCategory.count({ where });

    // Get paginated results
    const categories = await prisma.serviceCategory.findMany({
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
        _count: {
          select: {
            serviceCatalogItems: true,
            incidentCatalogItems: true,
          },
        },
      },
    });

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      categories: categories.map(category => {
        if (type === 'incident') {
          return {
            ...category,
            incidentCount: category._count.incidentCatalogItems,
          };
        } else if (type === 'service') {
          return {
            ...category,
            serviceCount: category._count.serviceCatalogItems,
          };
        } else {
          // Default: return combined count for backward compatibility
          return {
            ...category,
            serviceCount: category._count.serviceCatalogItems + category._count.incidentCatalogItems,
          };
        }
      }),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service categories' },
      { status: 500 }
    );
  }
}

// POST /api/service-categories - Create new service category
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Debug: Log session user info
    console.log('Session user:', {
      id: session.user.id,
      idType: typeof session.user.id,
      parsedId: parseInt(session.user.id),
      email: session.user.email
    });

    // Check if the user exists in the database
    const userExists = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, emp_fname: true, emp_lname: true }
    });

    console.log('User exists check:', userExists);

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found in database. Please contact administrator.' },
        { status: 400 }
      );
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.serviceCategory.create({
      data: {
        name,
        description,
        icon,
        isActive: isActive ?? true,
        createdBy: parseInt(session.user.id),
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

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating service category:', error);
    return NextResponse.json(
      { error: 'Failed to create service category' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-categories - Delete service category
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
        { error: 'Service category ID is required' },
        { status: 400 }
      );
    }

    // Check if service category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        serviceCatalogItems: {
          include: {
            template: true
          }
        },
        templates: true
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Service category not found' },
        { status: 404 }
      );
    }

    // Check if category has any service catalog items
    if (existingCategory.serviceCatalogItems.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete service category. There are ${existingCategory.serviceCatalogItems.length} service(s) in this category. Please delete or reassign all services first.`,
          serviceCount: existingCategory.serviceCatalogItems.length
        },
        { status: 409 }
      );
    }

    // Check if category has any templates directly associated
    if (existingCategory.templates.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete service category. There are ${existingCategory.templates.length} template(s) associated with this category. Please delete or reassign all templates first.`,
          templateCount: existingCategory.templates.length
        },
        { status: 409 }
      );
    }

    // Delete the service category
    await prisma.serviceCategory.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'Service category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service category:', error);
    return NextResponse.json(
      { error: 'Failed to delete service category' },
      { status: 500 }
    );
  }
}
