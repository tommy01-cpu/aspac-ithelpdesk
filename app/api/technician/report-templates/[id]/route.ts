import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Fetch specific template
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const templateId = parseInt(params.id);
    
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
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
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

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
        isOwner: template.createdBy === parseInt(session.user.id.toString()),
        creator: {
          name: `${template.creator.emp_fname} ${template.creator.emp_lname}`,
          email: template.creator.emp_email
        }
      }
    });
  } catch (error) {
    console.error("Error fetching report template:", error);
    return NextResponse.json(
      { error: "Failed to fetch report template" },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const templateId = parseInt(params.id);
    const body = await request.json();
    const { name, description, selectedFields, filters, isShared } = body;

    // Check if template exists and user owns it
    const existingTemplate = await prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdBy: parseInt(session.user.id.toString())
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 404 }
      );
    }

    // Validation
    if (!name || !selectedFields || selectedFields.length === 0) {
      return NextResponse.json(
        { error: "Name and selected fields are required" },
        { status: 400 }
      );
    }

    // Check if template name already exists for this user (excluding current template)
    const nameExists = await prisma.reportTemplate.findFirst({
      where: {
        name,
        createdBy: parseInt(session.user.id.toString()),
        id: { not: templateId }
      }
    });

    if (nameExists) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 400 }
      );
    }

    const updatedTemplate = await prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description,
        selectedFields,
        filters: filters || {},
        isShared: Boolean(isShared)
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
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        selectedFields: updatedTemplate.selectedFields,
        filters: updatedTemplate.filters,
        isShared: updatedTemplate.isShared,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
        isOwner: true,
        creator: {
          name: `${updatedTemplate.creator.emp_fname} ${updatedTemplate.creator.emp_lname}`,
          email: updatedTemplate.creator.emp_email
        }
      }
    });
  } catch (error) {
    console.error("Error updating report template:", error);
    return NextResponse.json(
      { error: "Failed to update report template" },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const templateId = parseInt(params.id);

    // Check if template exists and user owns it
    const existingTemplate = await prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdBy: parseInt(session.user.id.toString())
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.reportTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting report template:", error);
    return NextResponse.json(
      { error: "Failed to delete report template" },
      { status: 500 }
    );
  }
}
