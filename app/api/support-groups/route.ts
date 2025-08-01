import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch support groups with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // Build search conditions
    const searchConditions = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.supportGroup.count({
      where: searchConditions
    });
    
    // Fetch support groups with technician memberships
    const supportGroups = await prisma.supportGroup.findMany({
      where: searchConditions,
      skip: offset,
      take: limit,
      include: {
        technicianMemberships: {
          include: {
            technician: {
              select: {
                id: true,
                displayName: true,
                loginName: true,
                isActive: true,
                user: {
                  select: {
                    emp_code: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            technicianMemberships: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to match frontend interface
    const transformedGroups = supportGroups.map(group => ({
      id: group.id.toString(),
      groupName: group.name,
      description: group.description || '',
      technicians: group.technicianMemberships.map(membership => membership.technician.displayName),
      technicianIds: group.technicianMemberships.map(membership => membership.technician.id),
      isActive: group.isActive,
      technicianCount: group._count.technicianMemberships,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      notifications: {
        newRequest: false,
        leftUnpicked: false,
        requestUpdated: false
      },
      groupEmail: '',
      senderName: '',
      senderEmail: ''
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching support groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support groups' },
      { status: 500 }
    );
  }
}

// POST - Create new support group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupName, description, technicianIds = [] } = body;

    if (!groupName) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if group name already exists
    const existingGroup = await prisma.supportGroup.findFirst({
      where: { name: groupName }
    });

    if (existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Support group with this name already exists' },
        { status: 409 }
      );
    }

    // Validate technician IDs if provided
    if (technicianIds.length > 0) {
      const validTechnicians = await prisma.technician.findMany({
        where: {
          id: { in: technicianIds },
          isActive: true
        }
      });

      if (validTechnicians.length !== technicianIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some technician IDs are invalid or inactive' },
          { status: 400 }
        );
      }
    }

    // Create support group with technician memberships in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the support group
      const newGroup = await tx.supportGroup.create({
        data: {
          name: groupName,
          description: description || null,
          isActive: true,
        }
      });

      // Create technician memberships if any
      if (technicianIds.length > 0) {
        await tx.technicianSupportGroup.createMany({
          data: technicianIds.map((technicianId: number) => ({
            technicianId,
            supportGroupId: newGroup.id,
            isLead: false,
          }))
        });
      }

      // Fetch the complete group with memberships
      return await tx.supportGroup.findUnique({
        where: { id: newGroup.id },
        include: {
          technicianMemberships: {
            include: {
              technician: {
                select: {
                  id: true,
                  displayName: true,
                  isActive: true,
                  user: {
                    select: {
                      emp_email: true,
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    // Transform response
    const transformedGroup = {
      id: result!.id.toString(),
      groupName: result!.name,
      description: result!.description || '',
      technicians: result!.technicianMemberships.map(membership => membership.technician.displayName),
      technicianIds: result!.technicianMemberships.map(membership => membership.technician.id),
      isActive: result!.isActive,
      createdAt: result!.createdAt,
      updatedAt: result!.updatedAt,
      notifications: {
        newRequest: false,
        leftUnpicked: false,
        requestUpdated: false
      },
      groupEmail: '',
      senderName: '',
      senderEmail: ''
    };

    return NextResponse.json({
      success: true,
      data: transformedGroup,
      message: 'Support group created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating support group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create support group' },
      { status: 500 }
    );
  }
}
