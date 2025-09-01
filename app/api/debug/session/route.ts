import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Debug API to check current session and technician status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'No active session found',
        session: null,
        technician: null
      }, { status: 401 });
    }

    // Look up user and technician data directly from database
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        technician: true,
        user_roles: {
          include: {
            roles: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        session,
        technician: null
      }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          isTechnician: session.user.isTechnician,
          isAdmin: session.user.isAdmin,
          roles: session.user.roles
        }
      },
      databaseUser: {
        id: user.id,
        emp_code: user.emp_code,
        emp_fname: user.emp_fname,
        emp_lname: user.emp_lname,
        emp_status: user.emp_status,
        hasTechnicianRecord: !!user.technician,
        roles: user.user_roles.map((ur: any) => ur.roles.name)
      },
      technician: user.technician ? {
        id: user.technician.id,
        userId: user.technician.userId,
        displayName: user.technician.displayName,
        isAdmin: user.technician.isAdmin,
        status: user.technician.status,
        isActive: user.technician.isActive
      } : null,
      debug: {
        shouldBeTechnician: !!user.technician,
        sessionSaysTechnician: session.user.isTechnician,
        match: !!user.technician === session.user.isTechnician
      }
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
