import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Fetch all report templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get user's own templates and shared templates
    const templates = await prisma.reportTemplate.findMany({
      where: {
        OR: [
          { createdBy: parseInt(session.user.id.toString()) },
          { isShared: true }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: [
        { isShared: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        selectedFields: template.selectedFields,
        filters: template.filters,
        isShared: template.isShared,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        isOwner: template.createdBy === parseInt(session.user.id.toString()),
        creator: {
          name: `${template.creator.emp_fname} ${template.creator.emp_lname}`,
          email: template.creator.emp_email
        }
      }))
    });
  } catch (error) {
    console.error("Error fetching report templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch report templates" },
      { status: 500 }
    );
  }
}

// POST - Create new report template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, selectedFields, filters, isShared } = body;

    // Validation
    if (!name || !selectedFields || selectedFields.length === 0) {
      return NextResponse.json(
        { error: "Name and selected fields are required" },
        { status: 400 }
      );
    }

    // Check if template name already exists for this user
    const existingTemplate = await prisma.reportTemplate.findFirst({
      where: {
        name,
        createdBy: parseInt(session.user.id.toString())
      }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 400 }
      );
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description,
        selectedFields,
        filters: filters || {},
        isShared: Boolean(isShared),
        createdBy: parseInt(session.user.id.toString())
      },
      include: {
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        selectedFields: template.selectedFields,
        filters: template.filters,
        isShared: template.isShared,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        isOwner: true,
        creator: {
          name: `${template.creator.emp_fname} ${template.creator.emp_lname}`,
          email: template.creator.emp_email
        }
      }
    });
  } catch (error) {
    console.error("Error creating report template:", error);
    return NextResponse.json(
      { error: "Failed to create report template" },
      { status: 500 }
    );
  }
}
