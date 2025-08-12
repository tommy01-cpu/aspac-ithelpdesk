import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// using shared prisma client

// PUT /api/service-categories/[id] - Update service category
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, icon, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if another category with same name exists (excluding current)
    const duplicateCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: categoryId },
      },
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.serviceCategory.update({
      where: { id: categoryId },
      data: {
        name,
        description,
        icon,
        isActive: isActive ?? true,
        updatedBy: parseInt(session.user.id),
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

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating service category:', error);
    return NextResponse.json(
      { error: 'Failed to update service category' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-categories/[id] - Delete service category
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            serviceCatalogItems: true,
            incidentCatalogItems: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has associated items
    const totalItems = existingCategory._count.serviceCatalogItems + existingCategory._count.incidentCatalogItems;
    if (totalItems > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${totalItems} associated items` },
        { status: 400 }
      );
    }

    await prisma.serviceCategory.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting service category:', error);
    return NextResponse.json(
      { error: 'Failed to delete service category' },
      { status: 500 }
    );
  }
}
