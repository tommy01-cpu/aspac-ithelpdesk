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

    // Fetch users with their roles using raw SQL to include profile_image
    let usersWithRoles;
    
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;
      usersWithRoles = await prisma.$queryRaw`
        SELECT 
          u.*,
          rm.id as "reportingManagerId",
          rm.first_name as "reportingManagerFirstName",
          rm.last_name as "reportingManagerLastName",
          rm.employee_id as "reportingManagerEmpCode",
          array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN users rm ON u."reportingToId" = rm.id
        WHERE (
          LOWER(u.first_name) LIKE ${searchPattern} OR
          LOWER(u.last_name) LIKE ${searchPattern} OR
          LOWER(u.corporate_email) LIKE ${searchPattern} OR
          LOWER(u.employee_id) LIKE ${searchPattern}
        )
        GROUP BY u.id, rm.id, rm.first_name, rm.last_name, rm.employee_id
        ORDER BY u.first_name ASC
        LIMIT ${limit}
      `;
    } else {
      usersWithRoles = await prisma.$queryRaw`
        SELECT 
          u.*,
          rm.id as "reportingManagerId",
          rm.first_name as "reportingManagerFirstName",
          rm.last_name as "reportingManagerLastName",
          rm.employee_id as "reportingManagerEmpCode",
          array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN users rm ON u."reportingToId" = rm.id
        GROUP BY u.id, rm.id, rm.first_name, rm.last_name, rm.employee_id
        ORDER BY u.first_name ASC
        LIMIT ${limit}
      `;
    }

    // Map the database fields back to the expected frontend format
    const mappedUsers = (usersWithRoles as any[]).map(user => ({
      id: user.id,
      emp_code: user.employee_id,
      emp_fname: user.first_name,
      emp_mid: user.middle_name,
      emp_lname: user.last_name,
      emp_suffix: user.suffix,
      emp_email: user.corporate_email,
      emp_cell: user.corporate_mobile_no,
      post_des: user.job_title,
      emp_status: user.status,
      department: user.department,
      created_at: user.created_at,
      profile_image: user.profile_image,
      description: user.description,
      landline_no: user.landline_no,
      local_no: user.local_no,
      reportingToId: user.reportingToId,
      reportingTo: user.reportingManagerId ? {
        id: user.reportingManagerId,
        emp_fname: user.reportingManagerFirstName,
        emp_lname: user.reportingManagerLastName,
        emp_code: user.reportingManagerEmpCode
      } : undefined,
      isServiceApprover: user.isServiceApprover || false,
      requester_view_permission: user.requester_view_permission || 'own_requests',
      roles: user.roles || [],
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

    // Update the user with profile image using raw SQL (workaround for Prisma client issue)
    if (profileImageName) {
      await prisma.$executeRaw`
        UPDATE users 
        SET profile_image = ${profileImageName}
        WHERE id = ${newUser.id}
      `;
    }

    // Fetch the updated user data
    const updatedUser = await prisma.$queryRaw`
      SELECT * FROM users WHERE id = ${newUser.id}
    `;

    return NextResponse.json({
      success: true,
      user: Array.isArray(updatedUser) ? updatedUser[0] : updatedUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create user',
    }, { status: 500 });
  }
}
