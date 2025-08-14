import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search') || '';
    const excludeExistingTechnicians = searchParams.get('excludeExistingTechnicians') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause based on filters
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { emp_fname: { contains: search, mode: 'insensitive' } },
        { emp_lname: { contains: search, mode: 'insensitive' } },
        { emp_email: { contains: search, mode: 'insensitive' } },
        { emp_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If role filter is specified, add role filter
    if (role && role !== 'all') {
      whereClause.user_roles = {
        some: {
          roles: {
            name: role,
          },
        },
      };
    }

    // Skip technician exclusion for now due to Prisma client schema mismatch
    // This feature will need to be reimplemented after Prisma client regeneration

    // Fetch users with their roles using Prisma includes
    const users = await prisma.users.findMany({
      where: whereClause,
      take: limit,
      orderBy: { emp_fname: 'asc' },
      include: {
        user_roles: {
          include: {
            roles: true,
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

    // Map the database fields back to the expected frontend format
    const mappedUsers = users.map(user => ({
      id: user.id,
      emp_code: user.emp_code,
      emp_fname: user.emp_fname,
      emp_mid: user.emp_mid,
      emp_lname: user.emp_lname,
      emp_suffix: user.emp_suffix,
      emp_email: user.emp_email,
      emp_cell: user.emp_cell,
      post_des: user.post_des,
      emp_status: user.emp_status,
      department: user.department,
      created_at: user.created_at,
      profile_image: user.profile_image,
      description: user.description,
      landline_no: user.landline_no,
      local_no: user.local_no,
      reportingToId: user.reportingToId,
      reportingTo: user.reportingTo ? {
        id: user.reportingTo.id,
        emp_fname: user.reportingTo.emp_fname,
        emp_lname: user.reportingTo.emp_lname,
        emp_code: user.reportingTo.emp_code
      } : undefined,
      isServiceApprover: user.isServiceApprover || false,
      requester_view_permission: user.requester_view_permission || 'own_requests',
      roles: user.user_roles.map(ur => ur.roles.name) || [],
    }));

    return NextResponse.json({ 
      success: true,
      users: mappedUsers 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let formData;
    let profileImageFile = null;

    // Check if request is FormData (with file upload) or JSON
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      formData = await req.formData();
      profileImageFile = formData.get('profile_image') as File;
    } else {
      formData = await req.json();
    }

    const {
      emp_code,
      emp_fname,
      emp_mid,
      emp_lname,
      emp_suffix,
      emp_email,
      emp_cell,
      post_des,
      department,
      emp_status,
      username,
      password,
      description,
      landline_no,
      local_no,
      reportingToId,
      isServiceApprover,
      requester_view_permission,
    } = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    // Validate required fields
    if (!emp_code || !emp_fname || !emp_lname) {
      return NextResponse.json({
        success: false,
        error: 'Employee code, first name, and last name are required',
      }, { status: 400 });
    }

    // Check if user with this employee ID already exists
    const existingUser = await prisma.users.findFirst({
      where: { emp_code: emp_code }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID already exists. Please use a different employee ID.',
      }, { status: 409 });
    }

    let profileImageName = null;

    // Handle profile image upload if present
    if (profileImageFile && profileImageFile.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(profileImageFile.type)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        }, { status: 400 });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (profileImageFile.size > maxSize) {
        return NextResponse.json({
          success: false,
          error: 'File size too large. Maximum size is 5MB.',
        }, { status: 400 });
      }

      // Save image file
      try {
        const { promises: fs } = require('fs');
        const path = require('path');

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        try {
          await fs.access(uploadsDir);
        } catch {
          await fs.mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(profileImageFile.name);
        profileImageName = `${emp_code}_${timestamp}${extension}`;
        const filepath = path.join(uploadsDir, profileImageName);

        // Save file
        const bytes = await profileImageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(filepath, new Uint8Array(buffer));
      } catch (error) {
        console.error('Error saving image:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to save profile image',
        }, { status: 500 });
      }
    }

    // Hash the password before storing
    const defaultPassword = password || emp_code;
    console.log('🔐 Creating user with password:', defaultPassword);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('🔐 Hashed password length:', hashedPassword.length);
    console.log('🔐 Hashed password sample:', hashedPassword.substring(0, 20) + '...');

    // Create user with username and password set to employee ID
    // Note: Use the actual Prisma field names that match the schema
    const newUser = await prisma.users.create({
      data: {
        emp_code,          // maps to employee_id
        emp_fname,         // maps to first_name
        emp_mid: emp_mid || null,          // maps to middle_name
        emp_lname,         // maps to last_name
        emp_suffix: emp_suffix || null,    // maps to suffix
        emp_email: emp_email || null,      // maps to corporate_email
        emp_cell: emp_cell || null,        // maps to corporate_mobile_no
        post_des: post_des || null,        // maps to job_title
        department: department || null,
        emp_status: emp_status || 'active', // maps to status
        password: hashedPassword, // Store hashed password
        // New fields
        description: description || null,
        landline_no: landline_no || null,
        local_no: local_no || null,
        reportingToId: reportingToId && reportingToId !== '' ? parseInt(reportingToId as string) : null,
        isServiceApprover: isServiceApprover === 'true' || isServiceApprover === true,
        requester_view_permission: requester_view_permission || 'own_requests',
      },
    });

    // Update the user with profile image using Prisma update
    let finalUser = newUser;
    if (profileImageName) {
      finalUser = await prisma.users.update({
        where: { id: newUser.id },
        data: { profile_image: profileImageName },
      });
    }

    return NextResponse.json({
      success: true,
      user: finalUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create user',
    }, { status: 500 });
  }
}
