import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      isActive,
      isAdmin,
    } = body;

    // Update technician profile with isActive and isAdmin fields
    const updatedTechnician = await prisma.technician.update({
      where: { id: parseInt(id) },
      data: {
        isActive: isActive !== undefined ? isActive : true,
        isAdmin: isAdmin !== undefined ? isAdmin : false,
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

    console.log('Technician profile updated successfully');
    return NextResponse.json({ 
      message: 'Technician updated successfully',
      technician: {
        id: updatedTechnician.id.toString(),
        userId: updatedTechnician.user.id,
        // Include ALL user information from users table
        user: {
          id: updatedTechnician.user.id,
          emp_fname: updatedTechnician.user.emp_fname,
          emp_mid: updatedTechnician.user.emp_mid,
          emp_lname: updatedTechnician.user.emp_lname,
          emp_code: updatedTechnician.user.emp_code,
          emp_email: updatedTechnician.user.emp_email,
          post_des: updatedTechnician.user.post_des,
          department: updatedTechnician.user.department,
          emp_status: updatedTechnician.user.emp_status,
        },
        // Only technician-specific fields (removed status/technicianStatus)
        isActive: updatedTechnician.isActive,
        supportGroupMemberships: updatedTechnician.supportGroupMemberships.map(sgm => ({
          supportGroup: {
            id: sgm.supportGroup.id.toString(),
            name: sgm.supportGroup.name
          }
        })),
        createdAt: updatedTechnician.createdAt.toISOString(),
        updatedAt: updatedTechnician.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error updating technician:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
    }

    // Delete technician profile using the technician ID
    await prisma.technician.delete({
      where: { id: parseInt(id) },
    });

    console.log('Technician profile deleted successfully');
    return NextResponse.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    console.error('Error deleting technician:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
