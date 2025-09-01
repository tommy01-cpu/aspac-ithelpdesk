import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ templates: [] });
    }

    const searchTerm = query.trim();
    
    // Search both service and incident templates
    const [serviceTemplates, incidentTemplates] = await Promise.all([
      // Search Service Templates
      prisma.serviceCatalogItem.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ],
          isActive: true
        },
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
        },
        take: 10 // Limit results
      }),
      
      // Search Incident Templates
      prisma.incidentCatalogItem.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ],
          isActive: true
        },
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
        },
        take: 10 // Limit results
      })
    ]);

    // Transform results to a unified format
    const results = [
      ...serviceTemplates.map((item: any) => ({
        id: item.id,
        templateId: item.templateId,
        name: item.name,
        description: item.description,
        type: 'service' as const,
        categoryName: item.category?.name || 'Uncategorized',
        categoryId: item.category?.id,
        templateName: item.template?.name || item.name,
        icon: '🔧', // Service icon
        url: `/requests/templateid/${item.templateId}`
      })),
      ...incidentTemplates.map((item: any) => ({
        id: item.id,
        templateId: item.templateId,
        name: item.name,
        description: item.description,
        type: 'incident' as const,
        categoryName: item.category?.name || 'Uncategorized',
        categoryId: item.category?.id,
        templateName: item.template?.name || item.name,
        icon: '⚠️', // Incident icon
        url: `/requests/templateid/${item.templateId}`
      }))
    ];

    // Sort by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExactMatch = a.name.toLowerCase() === searchTerm.toLowerCase();
      const bExactMatch = b.name.toLowerCase() === searchTerm.toLowerCase();
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // If both or neither are exact matches, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ 
      templates: results.slice(0, 10), // Limit to 10 total results
      total: results.length 
    });

  } catch (error) {
    console.error('Template search error:', error);
    return NextResponse.json(
      { error: 'Failed to search templates' },
      { status: 500 }
    );
  }
}
