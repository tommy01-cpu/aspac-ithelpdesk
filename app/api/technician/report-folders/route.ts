import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all folders for the current user with hierarchy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Fetch all folders accessible to the user (own folders + shared folders)
    const folders = await prisma.report_folders.findMany({
      where: {
        OR: [
          { created_by: parseInt(userId) },
          { is_shared: true }
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        },
        other_report_folders: {
          include: {
            users: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true
              }
            },
            _count: {
              select: {
                report_templates: true,
                other_report_folders: true
              }
            }
          }
        },
        _count: {
          select: {
            report_templates: true,
            other_report_folders: true
          }
        }
      },
      orderBy: [
        { parent_id: 'asc' },
        { name: 'asc' }
      ]
    })

    // Build hierarchical structure
    const buildHierarchy = (folders: any[], parentId: number | null = null): any[] => {
      return folders
        .filter(folder => folder.parent_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildHierarchy(folders, folder.id)
        }))
    }

    const hierarchicalFolders = buildHierarchy(folders)

    return NextResponse.json({ folders: hierarchicalFolders })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, parentId, createdBy, isShared } = body

    if (!name || !createdBy) {
      return NextResponse.json({ error: 'Name and createdBy are required' }, { status: 400 })
    }

    // Check if parent folder exists and user has access
    if (parentId) {
      const parentFolder = await prisma.report_folders.findFirst({
        where: {
          id: parentId,
          OR: [
            { created_by: createdBy },
            { is_shared: true }
          ]
        }
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found or access denied' }, { status: 404 })
      }
    }

    const folder = await prisma.report_folders.create({
      data: {
        name,
        description,
        parent_id: parentId || null,
        created_by: createdBy,
        is_shared: isShared || false
      },
      include: {
        users: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        },
        _count: {
          select: {
            report_templates: true,
            other_report_folders: true
          }
        }
      }
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}

// PUT - Update a folder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, isShared, userId } = body

    if (!id || !userId) {
      return NextResponse.json({ error: 'Folder ID and user ID are required' }, { status: 400 })
    }

    // Check if user owns the folder
    const existingFolder = await prisma.report_folders.findFirst({
      where: {
        id,
        created_by: userId
      }
    })

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    const folder = await prisma.report_folders.update({
      where: { id },
      data: {
        name,
        description,
        is_shared: isShared
      },
      include: {
        users: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        },
        _count: {
          select: {
            report_templates: true,
            other_report_folders: true
          }
        }
      }
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

// DELETE - Delete a folder
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const folderId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!folderId || !userId) {
      return NextResponse.json({ error: 'Folder ID and user ID are required' }, { status: 400 })
    }

    // Check if user owns the folder
    const existingFolder = await prisma.report_folders.findFirst({
      where: {
        id: parseInt(folderId),
        created_by: parseInt(userId)
      },
      include: {
        other_report_folders: true,
        report_templates: true
      }
    })

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    // Check if folder has children or reports
    if (existingFolder.other_report_folders.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete folder with subfolders. Please delete or move subfolders first.' 
      }, { status: 400 })
    }

    if (existingFolder.report_templates.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete folder with reports. Please delete or move reports first.' 
      }, { status: 400 })
    }

    await prisma.report_folders.delete({
      where: { id: parseInt(folderId) }
    })

    return NextResponse.json({ message: 'Folder deleted successfully' })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
