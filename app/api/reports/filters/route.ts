import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user info for department filtering
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        technician: true,
        userDepartment: true
      }
    });

    // Get all data for filters
    const userId = parseInt(session.user.id);

    // Get departments based on user role
    let departments;
    if (user?.isTechnician || user?.technician?.isAdmin) {
      // Technicians and admins can see all departments
      departments = await prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
    } else {
      // Check if user is department head of any departments (users can be head of multiple departments)
      departments = await prisma.department.findMany({
        where: { 
          departmentHeadId: userId,
          isActive: true 
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
    }

    const [users, templates, serviceCategories, technicians] = await Promise.all([
      
      // Users who have created requests
      prisma.users.findMany({
        where: {
          requests: {
            some: {}
          }
        },
        select: {
          id: true,
          emp_fname: true,
          emp_lname: true,
          emp_email: true,
          emp_code: true
        },
        orderBy: {
          emp_fname: 'asc'
        }
      }),
      
      // Templates
      prisma.template.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          type: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      
      // Service Categories
      prisma.serviceCategory.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      
      // Technicians - fetch from technician table with user details
      prisma.users.findMany({
        where: {
          emp_status: 'active',
          technician: {
            isActive: true
          }
        },
        select: {
          id: true,
          emp_fname: true,
          emp_lname: true,
          emp_email: true,
          emp_code: true,
          post_des: true,
          userDepartment: {
            select: {
              name: true
            }
          },
          technician: {
            select: {
              id: true,
              isActive: true,
              isAdmin: true
            }
          }
        },
        orderBy: [
          { emp_fname: 'asc' },
          { emp_lname: 'asc' }
        ]
      })
    ]);

    // Define enum values
    const requestTypes = ['service', 'incident'];
    const requestStatuses = ['for_approval', 'cancelled', 'open', 'on_hold', 'resolved', 'closed'];
    const approvalStatuses = ['pending_approval', 'for_clarification', 'rejected', 'approved', 'not_required'];
    const modes = ['email', 'portal', 'phone', 'walk-in'];
    const priorities = ['low', 'medium', 'high', 'top'];

    return NextResponse.json({
      requestTypes,
      requestStatuses,
      approvalStatuses,
      modes,
      priorities,
      departments: departments.map(d => ({ id: d.id, name: d.name })),
      users: users.map(u => ({
        id: u.id,
        name: `${u.emp_fname} ${u.emp_lname}`,
        email: u.emp_email,
        employeeId: u.emp_code
      })),
      templates: templates.map(t => ({ id: t.id, name: t.name, type: t.type })),
      serviceCategories: serviceCategories.map(sc => ({ id: sc.id, name: sc.name })),
      technicians: technicians.map(t => ({
        id: t.id,
        name: `${t.emp_fname} ${t.emp_lname}`,
        email: t.emp_email,
        employeeId: t.emp_code,
        position: t.post_des,
        department: t.userDepartment?.name || 'N/A',
        isAdmin: t.technician?.isAdmin || false
      }))
    });

  } catch (error) {
    console.error('Error fetching filter data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
