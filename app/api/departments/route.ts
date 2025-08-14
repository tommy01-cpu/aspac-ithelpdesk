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
    
    // Get total count for pagination using Prisma
    const total = await prisma.department.count({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    });
    
    // Fetch departments with department head information using Prisma includes
    const departments = await prisma.department.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_code: true,
            emp_email: true,
            post_des: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    });
    
    // Transform the data
    const transformedDepartments = departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description || undefined,
      departmentHead: dept.departmentHead ? {
        id: dept.departmentHead.id.toString(),
        name: `${dept.departmentHead.emp_fname} ${dept.departmentHead.emp_lname}`,
        firstName: dept.departmentHead.emp_fname,
        lastName: dept.departmentHead.emp_lname,
        employeeId: dept.departmentHead.emp_code || '',
        email: dept.departmentHead.emp_email || '',
        jobTitle: dept.departmentHead.post_des || ''
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
    
    // Create department using Prisma
    const departmentHeadIdValue = departmentHeadId ? parseInt(departmentHeadId) : undefined;
    
    const newDepartment = await prisma.department.create({
      data: {
        name,
        description: description || undefined,
        departmentHeadId: departmentHeadIdValue,
        isActive: isActive,
      },
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Department created successfully',
      department: {
        id: newDepartment.id,
        name: newDepartment.name,
        description: newDepartment.description || undefined,
        isActive: newDepartment.isActive,
        createdAt: newDepartment.createdAt.toISOString(),
        updatedAt: newDepartment.updatedAt.toISOString(),
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
