import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch single support group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid support group ID' },
        { status: 400 }
      );
    }

    const supportGroup = await prisma.supportGroup.findUnique({
      where: { id },
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

    if (!supportGroup) {
      return NextResponse.json(
        { success: false, error: 'Support group not found' },
        { status: 404 }
      );
    }

    // Transform data
    const transformedGroup = {
      id: supportGroup.id.toString(),
      groupName: supportGroup.name,
      description: supportGroup.description || '',
      technicians: supportGroup.technicianMemberships.map(membership => membership.technician.displayName),
      technicianIds: supportGroup.technicianMemberships.map(membership => membership.technician.id),
      isActive: supportGroup.isActive,
      createdAt: supportGroup.createdAt,
      updatedAt: supportGroup.updatedAt,
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
      data: transformedGroup
    });

  } catch (error) {
    console.error('Error fetching support group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support group' },
      { status: 500 }
    );
  }
}

// PUT - Update support group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { groupName, description, technicianIds = [] } = body;

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid support group ID' },
        { status: 400 }
      );
    }

    if (!groupName) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if support group exists
    const existingGroup = await prisma.supportGroup.findUnique({
      where: { id }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Support group not found' },
        { status: 404 }
      );
    }

    // Check if group name already exists (excluding current group)
    const duplicateName = await prisma.supportGroup.findFirst({
      where: { 
        name: groupName,
        id: { not: id }
      }
    });

    if (duplicateName) {
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

    // Update support group with technician memberships in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the support group
      const updatedGroup = await tx.supportGroup.update({
        where: { id },
        data: {
          name: groupName,
          description: description || null,
          updatedAt: new Date(),
        }
      });

      // Remove existing technician memberships
      await tx.technicianSupportGroup.deleteMany({
        where: { supportGroupId: id }
      });

      // Create new technician memberships if any
      if (technicianIds.length > 0) {
        await tx.technicianSupportGroup.createMany({
          data: technicianIds.map((technicianId: number) => ({
            technicianId,
            supportGroupId: id,
            isLead: false,
          }))
        });
      }

      // Fetch the complete updated group with memberships
      return await tx.supportGroup.findUnique({
        where: { id },
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
      message: 'Support group updated successfully'
    });

  } catch (error) {
    console.error('Error updating support group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update support group' },
      { status: 500 }
    );
  }
}

// DELETE - Delete support group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid support group ID' },
        { status: 400 }
      );
    }

    // Check if support group exists
    const existingGroup = await prisma.supportGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            technicianMemberships: true
          }
        }
      }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Support group not found' },
        { status: 404 }
      );
    }

    // Delete in transaction to ensure referential integrity
    await prisma.$transaction(async (tx) => {
      // Delete technician memberships first
      await tx.technicianSupportGroup.deleteMany({
        where: { supportGroupId: id }
      });

      // Delete the support group
      await tx.supportGroup.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Support group deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting support group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete support group' },
      { status: 500 }
    );
  }
}
