import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch support groups for template assignment (simplified format)
export async function GET(request: NextRequest) {
  try {
    const supportGroups = await prisma.supportGroup.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        _count: {
          select: {
            technicianMemberships: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform data to match frontend interface
    const transformedGroups = supportGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isActive: group.isActive,
      technicianCount: group._count.technicianMemberships
    }));
    
    return NextResponse.json({
      success: true,
      supportGroups: transformedGroups
    });
    
  } catch (error) {
    console.error('Error fetching support groups for template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support groups' },
      { status: 500 }
    );
  }
}
