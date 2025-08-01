import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/service-catalog/[id] - Update service catalog item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.id);
    const { name, description, categoryId, templateId, isActive } = await req.json();

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.serviceCatalogItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Service catalog item not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current item)
    const duplicateItem = await prisma.serviceCatalogItem.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: itemId },
      },
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: 'A service catalog item with this name already exists' },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.serviceCatalogItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        categoryId,
        templateId: templateId || null,
        isActive: isActive ?? true,
        updatedBy: parseInt(session.user.id),
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
      ...updatedItem,
      categoryName: updatedItem.category.name,
      templateName: updatedItem.template?.name || null,
    });
  } catch (error) {
    console.error('Error updating service catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to update service catalog item' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-catalog/[id] - Delete service catalog item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.id);

    // Check if item exists
    const existingItem = await prisma.serviceCatalogItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Service catalog item not found' },
        { status: 404 }
      );
    }

    // Delete the service catalog item
    await prisma.serviceCatalogItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: 'Service catalog item deleted successfully' });
  } catch (error) {
    console.error('Error deleting service catalog item:', error);
    return NextResponse.json(
      { error: 'Failed to delete service catalog item' },
      { status: 500 }
    );
  }
}
