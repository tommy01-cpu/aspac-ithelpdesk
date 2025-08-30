import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint for reordering catalog items
 * Supports: service categories, service catalog items, incident catalog items
 */

interface ReorderRequest {
  type: 'service-categories' | 'service-catalog' | 'incident-catalog';
  items: Array<{
    id: number;
    sortOrder: number;
    categoryId?: number; // For catalog items
  }>;
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ReorderRequest = await request.json();
    const { type, items } = body;

    if (!type || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.log(`🔄 Reordering ${type} with ${items.length} items`);
    console.log('Items to reorder:', items);

    // Validate type before proceeding
    if (!['service-categories', 'service-catalog', 'incident-catalog'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: service-categories, service-catalog, or incident-catalog' },
        { status: 400 }
      );
    }

    // Execute all updates using transaction
    await prisma.$transaction(async (tx) => {
      switch (type) {
        case 'service-categories':
          for (const item of items) {
            console.log(`Updating category ${item.id} to sortOrder ${item.sortOrder}`);
            await tx.serviceCategory.update({
              where: { id: item.id },
              data: { 
                sortOrder: item.sortOrder,
                updatedAt: new Date(),
                updatedBy: parseInt(session.user.id)
              }
            });
          }
          break;

        case 'service-catalog':
          for (const item of items) {
            console.log(`Updating service ${item.id} to sortOrder ${item.sortOrder}`);
            await tx.serviceCatalogItem.update({
              where: { id: item.id },
              data: { 
                sortOrder: item.sortOrder,
                updatedAt: new Date(),
                updatedBy: parseInt(session.user.id)
              }
            });
          }
          break;

        case 'incident-catalog':
          for (const item of items) {
            console.log(`Updating incident ${item.id} to sortOrder ${item.sortOrder}`);
            await tx.incidentCatalogItem.update({
              where: { id: item.id },
              data: { 
                sortOrder: item.sortOrder,
                updatedAt: new Date(),
                updatedBy: parseInt(session.user.id)
              }
            });
          }
          break;
      }
    });

    console.log(`✅ Successfully reordered ${items.length} ${type} items`);

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${items.length} ${type.replace('-', ' ')} items`,
      itemsUpdated: items.length
    });

  } catch (error) {
    console.error('❌ Catalog reordering error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reorder items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      );
    }

    let data: any[] = [];

    switch (type) {
      case 'service-categories':
        data = await prisma.serviceCategory.findMany({
          where: { isActive: true },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            sortOrder: true,
            serviceCount: true,
            createdAt: true
          }
        });
        break;

      case 'service-catalog':
        const categoryId = searchParams.get('categoryId');
        data = await prisma.serviceCatalogItem.findMany({
          where: { 
            isActive: true,
            ...(categoryId ? { categoryId: parseInt(categoryId) } : {})
          },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            template: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        break;

      case 'incident-catalog':
        const incidentCategoryId = searchParams.get('categoryId');
        data = await prisma.incidentCatalogItem.findMany({
          where: { 
            isActive: true,
            ...(incidentCategoryId ? { categoryId: parseInt(incidentCategoryId) } : {})
          },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            template: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('❌ Get catalog items error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
