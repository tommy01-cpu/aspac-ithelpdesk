import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch technicians with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // Build search conditions - search through user data and technician data
    const searchConditions = search ? {
      OR: [
        { displayName: { contains: search, mode: 'insensitive' as const } },
        { user: { emp_code: { contains: search, mode: 'insensitive' as const } } },
        { user: { emp_fname: { contains: search, mode: 'insensitive' as const } } },
        { user: { emp_lname: { contains: search, mode: 'insensitive' as const } } },
        { user: { emp_email: { contains: search, mode: 'insensitive' as const } } },
        { user: { department: { contains: search, mode: 'insensitive' as const } } },
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.technician.count({
      where: searchConditions
    });
    
    // Fetch technicians with related data
    const technicians = await prisma.technician.findMany({
      where: searchConditions,
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_mid: true,
            emp_lname: true,
            emp_suffix: true,
            emp_code: true,
            emp_email: true,
            emp_cell: true,
            post_des: true,
            department: true,
            emp_status: true,
            description: true,
            landline_no: true,
            local_no: true,
            requester_view_permission: true,
            profile_image: true,
            reportingTo: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
              }
            }
          }
        },
        supportGroupMemberships: {
          include: {
            supportGroup: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform the data to include all user information
    const transformedTechnicians = technicians.map(tech => ({
      id: tech.id.toString(),
      userId: tech.user.id,
      // Include ALL user information from users table with new fields
      user: {
        id: tech.user.id,
        emp_fname: tech.user.emp_fname,
        emp_mid: tech.user.emp_mid,
        emp_lname: tech.user.emp_lname,
        emp_suffix: tech.user.emp_suffix,
        emp_code: tech.user.emp_code,
        emp_email: tech.user.emp_email,
        emp_cell: tech.user.emp_cell,
        post_des: tech.user.post_des,
        department: tech.user.department,
        emp_status: tech.user.emp_status,
        profile_image: tech.user.profile_image,
        description: tech.user.description,
        landline_no: tech.user.landline_no,
        local_no: tech.user.local_no,
        requester_view_permission: tech.user.requester_view_permission,
        reportingTo: tech.user.reportingTo,
      },
      // Essential technician fields including isAdmin
      isActive: tech.isActive,
      isAdmin: tech.isAdmin || false,
      supportGroupMemberships: tech.supportGroupMemberships.map(sgm => ({
        supportGroup: {
          id: sgm.supportGroup.id.toString(),
          name: sgm.supportGroup.name
        }
      })),
      createdAt: tech.createdAt.toISOString(),
      updatedAt: tech.updatedAt.toISOString(),
    }));
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      technicians: transformedTechnicians,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technicians' },
      { status: 500 }
    );
  }
}

// POST - Create new technician
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      userId,
      isActive,
      isAdmin,
    } = data;

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if technician already exists for this user
    const existingTechnician = await prisma.technician.findUnique({
      where: { userId: parseInt(userId) }
    });

    if (existingTechnician) {
      return NextResponse.json(
        { error: 'Technician profile already exists for this user' },
        { status: 409 }
      );
    }

    // Create technician with userId, isActive, and isAdmin
    const technician = await prisma.technician.create({
      data: {
        userId: parseInt(userId),
        isActive: isActive !== undefined ? isActive : true,
        isAdmin: isAdmin !== undefined ? isAdmin : false,
        // Set default values for required fields that we're not actively using
        displayName: `${user.emp_fname} ${user.emp_lname}`, // Auto-generate from user data
        vipUser: false,
        enableTelephony: false,
        costPerHour: 0,
        allowedToViewCostPerHour: false,
        serviceRequestApprover: false,
        purchaseApprover: false,
        enableLogin: false,
        // Note: Removed status field as requested
      },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_mid: true,
            emp_lname: true,
            emp_code: true,
            emp_email: true,
            post_des: true,
            department: true,
            emp_status: true,
          }
        },
        supportGroupMemberships: {
          include: {
            supportGroup: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Technician created successfully',
      technician: {
        id: technician.id.toString(),
        userId: technician.user.id,
        // Include ALL user information from users table
        user: {
          id: technician.user.id,
          emp_fname: technician.user.emp_fname,
          emp_mid: technician.user.emp_mid,
          emp_lname: technician.user.emp_lname,
          emp_code: technician.user.emp_code,
          emp_email: technician.user.emp_email,
          post_des: technician.user.post_des,
          department: technician.user.department,
          emp_status: technician.user.emp_status,
        },
        // Only technician-specific fields
        isActive: technician.isActive,
        supportGroupMemberships: technician.supportGroupMemberships.map(sgm => ({
          supportGroup: {
            id: sgm.supportGroup.id.toString(),
            name: sgm.supportGroup.name
          }
        })),
        createdAt: technician.createdAt.toISOString(),
        updatedAt: technician.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error creating technician:', error);
    return NextResponse.json(
      { error: 'Failed to create technician' },
      { status: 500 }
    );
  }
}
