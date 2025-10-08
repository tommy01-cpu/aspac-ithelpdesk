import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is an admin request or regular homepage request
    const { searchParams } = new URL(request.url);
    const isAdminView = searchParams.get('admin') === 'true';

    let whereClause = {};
    let limit: number | undefined = 5; // Default limit for homepage

    if (isAdminView) {
      // Admin view: show ALL announcements (active and inactive)
      whereClause = {}; // No filter, show all
      limit = undefined; // No limit for admin
    } else {
      // Homepage view: only show active announcements
      whereClause = { isActive: true };
    }

    const queryOptions: any = {
      where: whereClause,
      include: {
        creator: {
          select: {
            emp_fname: true,
            emp_lname: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    };

    // Only add limit for non-admin requests
    if (limit) {
      queryOptions.take = limit;
    }

    const announcements = await prisma.announcement.findMany(queryOptions);

    console.log(`Fetching announcements - isAdminView: ${isAdminView}, found: ${announcements.length}`);

    return NextResponse.json({ announcements });

  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since admin UI already restricts access, we just need basic authentication

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Create new announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        createdBy: parseInt(session.user.id.toString())
      },
      include: {
        creator: {
          select: {
            emp_fname: true,
            emp_lname: true,
          }
        }
      }
    });

    return NextResponse.json({ announcement });

  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}