import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const userId = parseInt(params.id);
    
    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
        departmentsManaged: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        userDepartment: {
          select: {
            id: true,
            name: true,
            description: true,
            departmentHead: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_code: true,
              },
            },
          },
        },
        reportingTo: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_code: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    const userWithRoles = {
      ...user,
      roles: user.user_roles.map(ur => ur.roles.name),
      departmentsManaged: user.departmentsManaged || [],
      userDepartment: user.userDepartment,
      reportingTo: user.reportingTo,
    };

    return NextResponse.json({
      success: true,
      user: userWithRoles,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user',
    }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const userId = parseInt(params.id);
    
    // Validate user ID
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID provided',
        details: 'User ID must be a valid number',
      }, { status: 400 });
    }

    const formData = await req.formData();
    
    // Extract form fields
    const emp_code = formData.get('emp_code') as string;
    const emp_fname = formData.get('emp_fname') as string;
    const emp_mid = formData.get('emp_mid') as string;
    const emp_lname = formData.get('emp_lname') as string;
    const emp_suffix = formData.get('emp_suffix') as string;
    const emp_email = formData.get('emp_email') as string;
    const emp_cell = formData.get('emp_cell') as string;
    const post_des = formData.get('post_des') as string;
    const department = formData.get('department') as string;
    const emp_status = formData.get('emp_status') as string;
    const profileImage = formData.get('profile_image') as File | null;
    
    // New fields
    const description = formData.get('description') as string;
    const landline_no = formData.get('landline_no') as string;
    const local_no = formData.get('local_no') as string;
    const reportingToId = formData.get('reportingToId') as string;
    const isServiceApprover = formData.get('isServiceApprover') as string;
    const requester_view_permission = formData.get('requester_view_permission') as string;

    // Validate required fields
    if (!emp_code || !emp_fname || !emp_lname || !emp_email) {
      const missingFields = [];
      if (!emp_code) missingFields.push('Employee Code');
      if (!emp_fname) missingFields.push('First Name');
      if (!emp_lname) missingFields.push('Last Name');
      if (!emp_email) missingFields.push('Email');

      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        details: `The following fields are required: ${missingFields.join(', ')}`,
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emp_email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        details: 'Please provide a valid email address',
      }, { status: 400 });
    }

    let profile_image_filename = null;

    // Handle image upload if provided
    if (profileImage && profileImage.size > 0) {
      // Validate image
      if (profileImage.size > 5 * 1024 * 1024) {
        return NextResponse.json({
          success: false,
          error: 'Image size too large',
          details: 'Image size must be less than 5MB',
        }, { status: 400 });
      }

      if (!profileImage.type.startsWith('image/')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid file type',
          details: 'File must be an image (JPEG, PNG, GIF, etc.)',
        }, { status: 400 });
      }

      // Create filename with employee code and timestamp
      const timestamp = Date.now();
      const extension = profileImage.name.split('.').pop();
      profile_image_filename = `${emp_code}_${timestamp}.${extension}`;

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Save image file
      const buffer = Buffer.from(await profileImage.arrayBuffer());
      const imagePath = path.join(uploadsDir, profile_image_filename);
      
      console.log('Saving image to:', imagePath);
      await fs.writeFile(imagePath, new Uint8Array(buffer));

      // Delete old profile image if it exists
      try {
        const existingUser = await prisma.$queryRaw`SELECT profile_image FROM users WHERE id = ${userId}` as any[];
        if (existingUser.length > 0 && existingUser[0].profile_image) {
          const oldImagePath = path.join(uploadsDir, existingUser[0].profile_image);
          try {
            await fs.unlink(oldImagePath);
          } catch (error) {
            console.log('Old image file not found or could not be deleted:', error);
          }
        }
      } catch (error) {
        console.log('Could not check for existing image:', error);
      }
    }

    // Update user using raw SQL to avoid Prisma client regeneration issues
    let updateQuery;
    let updatedUser;

    if (profile_image_filename) {
      updateQuery = `
        UPDATE users SET 
          employee_id = $1,
          first_name = $2,
          middle_name = $3,
          last_name = $4,
          suffix = $5,
          corporate_email = $6,
          corporate_mobile_no = $7,
          job_title = $8,
          department = $9,
          status = $10,
          profile_image = $11,
          description = $12,
          landline_no = $13,
          local_no = $14,
          "reportingToId" = $15,
          "isServiceApprover" = $16,
          requester_view_permission = $17
        WHERE id = $18::integer
        RETURNING *
      `;
      
      updatedUser = await prisma.$queryRawUnsafe(
        updateQuery,
        emp_code,
        emp_fname,
        emp_mid || null,
        emp_lname,
        emp_suffix || null,
        emp_email,
        emp_cell || null,
        post_des || null,
        department || null,
        emp_status,
        profile_image_filename,
        description || null,
        landline_no || null,
        local_no || null,
        reportingToId && reportingToId !== 'none' && reportingToId !== '' ? parseInt(reportingToId) : null,
        isServiceApprover === 'true',
        requester_view_permission || 'own_requests',
        userId.toString()
      );
    } else {
      updateQuery = `
        UPDATE users SET 
          employee_id = $1,
          first_name = $2,
          middle_name = $3,
          last_name = $4,
          suffix = $5,
          corporate_email = $6,
          corporate_mobile_no = $7,
          job_title = $8,
          department = $9,
          status = $10,
          description = $11,
          landline_no = $12,
          local_no = $13,
          "reportingToId" = $14,
          "isServiceApprover" = $15,
          requester_view_permission = $16
        WHERE id = $17::integer
        RETURNING *
      `;
      
      updatedUser = await prisma.$queryRawUnsafe(
        updateQuery,
        emp_code,
        emp_fname,
        emp_mid || null,
        emp_lname,
        emp_suffix || null,
        emp_email,
        emp_cell || null,
        post_des || null,
        department || null,
        emp_status,
        description || null,
        landline_no || null,
        local_no || null,
        reportingToId && reportingToId !== 'none' && reportingToId !== '' ? parseInt(reportingToId) : null,
        isServiceApprover === 'true',
        requester_view_permission || 'own_requests',
        userId.toString()
      );
    }

    console.log('Executing query:', updateQuery);
    console.log('User updated successfully:', { userId, profile_image_filename });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint') || error.message.includes('UNIQUE constraint')) {
        return NextResponse.json({
          success: false,
          error: 'Duplicate data conflict',
          details: 'A user with this employee code or email already exists',
        }, { status: 409 });
      }
      
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid reference',
          details: 'Referenced department or other entity does not exist',
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update user',
      details: 'An internal server error occurred. Please try again or contact support if the problem persists.',
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const userId = parseInt(params.id);

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check if user has associated requests
    const requestCount = await prisma.request.count({
      where: { userId: userId },
    });

    if (requestCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete user. This user has ${requestCount} associated request(s). Please reassign or delete the requests first.`,
      }, { status: 400 });
    }

    // Note: Skipping technician profile cleanup due to Prisma client schema mismatch
    // This will be handled by database CASCADE on DELETE if properly configured

    // Check if user has roles
    await prisma.user_roles.deleteMany({
      where: { user_id: userId },
    });

    // Now delete the user
    await prisma.users.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // Handle specific Prisma errors
    if (error?.code === 'P2003') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete user due to related records. Please remove all associated data first.',
      }, { status: 400 });
    }
    
    if (error?.code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete user',
    }, { status: 500 });
  }
}
