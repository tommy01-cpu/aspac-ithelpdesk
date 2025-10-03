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

    // Get active announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
      },
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
      },
      take: 5 // Limit to 5 most recent announcements
    });

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