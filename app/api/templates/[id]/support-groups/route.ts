import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get support groups assigned to a template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid Template ID' },
        { status: 400 }
      );
    }

    // Get the template first
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get support group assignments for this template
    const supportGroupAssignments = await prisma.templateSupportGroup.findMany({
      where: { templateId: templateId },
      include: {
        supportGroup: {
          include: {
            technicianMemberships: {
              where: {
                technician: { isActive: true }
              },
              include: {
                technician: {
                  select: {
                    id: true,
                    displayName: true,
                    user: {
                      select: {
                        emp_email: true,
                        department: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      supportGroups: supportGroupAssignments.map(assignment => ({
        id: assignment.id,
        supportGroup: assignment.supportGroup,
        isActive: assignment.isActive,
        loadBalanceType: assignment.loadBalanceType,
        priority: assignment.priority,
        technicianCount: assignment.supportGroup.technicianMemberships.length
      }))
    });

  } catch (error) {
    console.error('Error fetching template support groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Assign support groups to a template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);
    const { supportGroups } = await request.json();

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid Template ID' },
        { status: 400 }
      );
    }

    if (!Array.isArray(supportGroups)) {
      return NextResponse.json(
        { error: 'Support groups must be an array' },
        { status: 400 }
      );
    }

    // Verify template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify all support groups exist and are active
    const supportGroupIds = supportGroups.map(sg => sg.supportGroupId);
    const existingSupportGroups = await prisma.supportGroup.findMany({
      where: {
        id: { in: supportGroupIds },
        isActive: true
      }
    });

    if (existingSupportGroups.length !== supportGroupIds.length) {
      return NextResponse.json(
        { error: 'One or more support groups not found or inactive' },
        { status: 400 }
      );
    }

    // Use transaction to replace support group assignments
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing assignments
      await tx.templateSupportGroup.deleteMany({
        where: { templateId: templateId }
      });

      // Create new assignments
      const assignments = await tx.templateSupportGroup.createMany({
        data: supportGroups.map((sg, index) => ({
          templateId: templateId,
          supportGroupId: sg.supportGroupId,
          isActive: sg.isActive ?? true,
          loadBalanceType: sg.loadBalanceType ?? 'round_robin',
          priority: sg.priority ?? (index + 1)
        }))
      });

      return assignments;
    });

    return NextResponse.json({
      message: 'Support groups assigned successfully',
      assignmentsCreated: result.count
    });

  } catch (error) {
    console.error('Error assigning support groups to template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update support group assignments for a template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);
    const { assignments } = await request.json();

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid Template ID' },
        { status: 400 }
      );
    }

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: 'Assignments must be an array' },
        { status: 400 }
      );
    }

    // Update assignments
    const updatePromises = assignments.map(assignment => 
      prisma.templateSupportGroup.update({
        where: { id: assignment.id },
        data: {
          isActive: assignment.isActive,
          loadBalanceType: assignment.loadBalanceType,
          priority: assignment.priority
        }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: 'Support group assignments updated successfully'
    });

  } catch (error) {
    console.error('Error updating template support group assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove specific support group assignment from template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid Template ID' },
        { status: 400 }
      );
    }

    if (assignmentId) {
      // Delete specific assignment
      await prisma.templateSupportGroup.delete({
        where: {
          id: parseInt(assignmentId),
          templateId: templateId
        }
      });

      return NextResponse.json({
        message: 'Support group assignment removed successfully'
      });
    } else {
      // Delete all assignments for this template
      await prisma.templateSupportGroup.deleteMany({
        where: { templateId: templateId }
      });

      return NextResponse.json({
        message: 'All support group assignments removed successfully'
      });
    }

  } catch (error) {
    console.error('Error removing template support group assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
