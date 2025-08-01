import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, departmentHeadId, isActive } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate department head if provided
    if (departmentHeadId && departmentHeadId !== '') {
      const user = await prisma.users.findUnique({
        where: { id: parseInt(departmentHeadId) }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Department head user not found' },
          { status: 404 }
        );
      }
    }

    // Update department using raw SQL to avoid Prisma client issues
    const departmentHeadIdValue = (departmentHeadId && departmentHeadId !== '') ? parseInt(departmentHeadId) : null;
    
    const result = await prisma.$queryRaw`
      UPDATE departments 
      SET name = ${name}, 
          description = ${description || null}, 
          "departmentHeadId" = ${departmentHeadIdValue}, 
          "isActive" = ${isActive !== undefined ? isActive : true},
          "updatedAt" = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id, name, description, "departmentHeadId", "isActive", "createdAt", "updatedAt"
    ` as any[];
    
    const department = result[0];

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found or could not be updated' },
        { status: 404 }
      );
    }

    // Get department head information using raw SQL
    const departmentWithHead = await prisma.$queryRaw`
      SELECT 
        d.id, 
        d.name, 
        d.description, 
        d."departmentHeadId", 
        d."isActive", 
        d."createdAt", 
        d."updatedAt",
        u.id as "headId",
        u.first_name as "headFirstName",
        u.last_name as "headLastName", 
        u.employee_id as "headEmployeeId",
        u.corporate_email as "headEmail",
        u.job_title as "headJobTitle"
      FROM departments d
      LEFT JOIN users u ON d."departmentHeadId" = u.id
      WHERE d.id = ${parseInt(id)}
    ` as any[];

    const departmentData = departmentWithHead[0];

    // Transform the response to include department head details
    const response = {
      id: departmentData.id,
      name: departmentData.name,
      description: departmentData.description,
      departmentHeadId: departmentData.departmentHeadId,
      isActive: departmentData.isActive,
      createdAt: departmentData.createdAt,
      updatedAt: departmentData.updatedAt,
      departmentHead: departmentData.headId ? {
        id: departmentData.headId.toString(),
        name: `${departmentData.headFirstName} ${departmentData.headLastName}`,
        firstName: departmentData.headFirstName,
        lastName: departmentData.headLastName,
        employeeId: departmentData.headEmployeeId || '',
        email: departmentData.headEmail || '',
        jobTitle: departmentData.headJobTitle || ''
      } : null
    };

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
      department: response,
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Delete department using raw SQL to avoid Prisma client issues
    const result = await prisma.$queryRaw`
      DELETE FROM departments 
      WHERE id = ${parseInt(id)}
      RETURNING id
    ` as any[];

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
