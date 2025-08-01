import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch departments with pagination and search
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
    
    // Get total count for pagination using raw SQL
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM departments
      WHERE (name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})
    ` as any[];
    const total = parseInt(totalResult[0].count);
    
    // Fetch departments with department head information
    const departments = await prisma.$queryRaw`
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
      WHERE (d.name ILIKE ${`%${search}%`} OR d.description ILIKE ${`%${search}%`})
      ORDER BY d.name ASC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];
    
    // Transform the data
    const transformedDepartments = departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description || undefined,
      departmentHead: dept.headId ? {
        id: dept.headId.toString(),
        name: `${dept.headFirstName} ${dept.headLastName}`,
        firstName: dept.headFirstName,
        lastName: dept.headLastName,
        employeeId: dept.headEmployeeId || '',
        email: dept.headEmail || '',
        jobTitle: dept.headJobTitle || ''
      } : undefined,
      isActive: dept.isActive,
      createdAt: dept.createdAt.toISOString(),
      updatedAt: dept.updatedAt.toISOString(),
    }));
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      departments: transformedDepartments,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

// POST - Create new department
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      name,
      description,
      departmentHeadId,
      isActive = true,
    } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Check if department with same name already exists
    const existingDepartment = await prisma.department.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' }
      }
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: 'Department with this name already exists' },
        { status: 409 }
      );
    }

    // Validate department head if provided
    if (departmentHeadId) {
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
    
    // Create department using raw SQL to avoid Prisma client issues
    const departmentHeadIdValue = departmentHeadId ? parseInt(departmentHeadId) : null;
    
    const result = await prisma.$queryRaw`
      INSERT INTO departments (name, description, "departmentHeadId", "isActive", "createdAt", "updatedAt")
      VALUES (${name}, ${description || null}, ${departmentHeadIdValue}, ${isActive}, NOW(), NOW())
      RETURNING id, name, description, "departmentHeadId", "isActive", "createdAt", "updatedAt"
    ` as any[];
    
    const department = result[0];

    return NextResponse.json({ 
      success: true,
      message: 'Department created successfully',
      department: {
        id: department.id,
        name: department.name,
        description: department.description || undefined,
        isActive: department.isActive,
        createdAt: department.createdAt.toISOString(),
        updatedAt: department.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
