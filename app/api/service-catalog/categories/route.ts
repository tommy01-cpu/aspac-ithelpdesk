import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/service-catalog/categories - Get service categories with their catalog items
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Build where clause for search
    const where = search
      ? {
          serviceCatalogItems: {
            some: {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
              isActive: true,
            },
          },
        }
      : {
          serviceCatalogItems: {
            some: {
              isActive: true,
            },
          },
        };

    // Get categories with their active service catalog items
    const categories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true,
        ...where,
      },
      include: {
        serviceCatalogItems: {
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            } : {}),
          },
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                type: true,
                fields: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter out categories with no service catalog items
    const filteredCategories = categories.filter(category => 
      category.serviceCatalogItems.length > 0
    );

    // Transform data to match the frontend interface
    const transformedCategories = filteredCategories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📋',
      serviceTemplates: category.serviceCatalogItems.map((item: any) => ({
        id: item.template?.id || item.id,
        name: item.name,
        description: item.description || '',
        icon: '🔧', // Default icon, you could add icon field to ServiceCatalogItem
        status: item.isActive ? 'ACTIVE' : 'INACTIVE' as const,
        catalogItemId: item.id,
        templateId: item.templateId,
        sla: {
          name: 'Standard', // You could link this to actual SLA data
          responseTime: 60,
          resolutionTime: 480,
        },
        _count: {
          requests: item.requestCount || 0,
        },
      })),
    }));

    return NextResponse.json({
      categories: transformedCategories,
    });
  } catch (error) {
    console.error('Error fetching service catalog categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service catalog categories' },
      { status: 500 }
    );
  }
}
