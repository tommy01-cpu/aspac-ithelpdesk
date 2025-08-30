import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all technicians from technician table
    const technicians = await prisma.technician.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        userId: true,
        displayName: true,
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    // If no technicians found, return empty array with totals
    if (technicians.length === 0) {
      // Still calculate unassigned requests
      const unassignedOnHold = await prisma.request.count({
        where: {
          status: 'on_hold',
          AND: [
            {
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: Prisma.JsonNull
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: Prisma.JsonNull
                  }
                },
                {
                  NOT: {
                    formData: {
                      path: ['assignedTechnicianId'],
                      not: Prisma.JsonNull
                    }
                  }
                }
              ]
            }
          ]
        }
      });

      const unassignedOpen = await prisma.request.count({
        where: {
          status: 'open',
          AND: [
            {
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: Prisma.JsonNull
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: Prisma.JsonNull
                  }
                },
                {
                  NOT: {
                    formData: {
                      path: ['assignedTechnicianId'],
                      not: Prisma.JsonNull
                    }
                  }
                }
              ]
            }
          ]
        }
      });

      const result = [];
      
      if (unassignedOnHold > 0 || unassignedOpen > 0) {
        result.push({
          id: 0,
          name: 'Unassigned',
          onHold: unassignedOnHold,
          open: unassignedOpen,
          overdue: 0,
          totalAssigned: unassignedOnHold + unassignedOpen
        });
      }

      // Add totals
      result.push({
        id: -999,
        name: 'Total',
        onHold: unassignedOnHold,
        open: unassignedOpen,
        overdue: 0,
        totalAssigned: unassignedOnHold + unassignedOpen
      });

      return NextResponse.json(result);
    }

    // Calculate stats for each technician
    const technicianStats = await Promise.all(
      technicians.map(async (tech) => {
        const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
        
        // Count requests by status for this technician
        const [onHold, open, overdue] = await Promise.all([
          // On-hold requests
          prisma.request.count({
            where: {
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId.toString()
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: techName
                  }
                }
              ],
              status: 'on_hold'
            }
          }),
          
          // Open requests
          prisma.request.count({
            where: {
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId.toString()
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: techName
                  }
                }
              ],
              status: 'open'
            }
          }),
          
          // Overdue requests (older than 3 days and still active)
          prisma.request.count({
            where: {
              OR: [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.userId.toString()
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: techName
                  }
                }
              ],
              status: {
                in: ['open', 'on_hold']
              },
              createdAt: {
                lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
              }
            }
          })
        ]);

        const totalAssigned = onHold + open;

        return {
          id: tech.userId, // Use userId instead of tech.id for consistency with formData
          name: techName,
          onHold,
          open,
          overdue,
          totalAssigned
        };
      })
    );

    // Add "Others" category for requests assigned to users not in technicians list
    const othersOnHold = await prisma.request.count({
      where: {
        status: 'on_hold',
        AND: [
          {
            NOT: {
              OR: technicians.flatMap(tech => [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.id
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.id.toString()
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim()
                  }
                }
              ])
            }
          },
          {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  not: Prisma.JsonNull
                }
              },
              {
                formData: {
                  path: ['assignedTechnician'],
                  not: Prisma.JsonNull
                }
              }
            ]
          }
        ]
      }
    });

    const othersOpen = await prisma.request.count({
      where: {
        status: 'open',
        AND: [
          {
            NOT: {
              OR: technicians.flatMap(tech => [
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.id
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnicianId'],
                    equals: tech.id.toString()
                  }
                },
                {
                  formData: {
                    path: ['assignedTechnician'],
                    equals: tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim()
                  }
                }
              ])
            }
          },
          {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  not: Prisma.JsonNull
                }
              },
              {
                formData: {
                  path: ['assignedTechnician'],
                  not: Prisma.JsonNull
                }
              }
            ]
          }
        ]
      }
    });

    // Add "Unassigned" category
    const unassignedOnHold = await prisma.request.count({
      where: {
        status: 'on_hold',
        AND: [
          {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: Prisma.JsonNull
                }
              },
              {
                formData: {
                  path: ['assignedTechnician'],
                  equals: Prisma.JsonNull
                }
              },
              {
                NOT: {
                  formData: {
                    path: ['assignedTechnicianId'],
                    not: Prisma.JsonNull
                  }
                }
              }
            ]
          }
        ]
      }
    });

    const unassignedOpen = await prisma.request.count({
      where: {
        status: 'open',
        AND: [
          {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: Prisma.JsonNull
                }
              },
              {
                formData: {
                  path: ['assignedTechnician'],
                  equals: Prisma.JsonNull
                }
              },
              {
                NOT: {
                  formData: {
                    path: ['assignedTechnicianId'],
                    not: Prisma.JsonNull
                  }
                }
              }
            ]
          }
        ]
      }
    });

    // Add summary rows
    if (othersOnHold > 0 || othersOpen > 0) {
      technicianStats.push({
        id: -1,
        name: 'Others',
        onHold: othersOnHold,
        open: othersOpen,
        overdue: 0,
        totalAssigned: othersOnHold + othersOpen
      });
    }

    if (unassignedOnHold > 0 || unassignedOpen > 0) {
      technicianStats.push({
        id: 0,
        name: 'Unassigned',
        onHold: unassignedOnHold,
        open: unassignedOpen,
        overdue: 0,
        totalAssigned: unassignedOnHold + unassignedOpen
      });
    }

    // Add totals
    const totalStats = {
      id: -999,
      name: 'Total',
      onHold: technicianStats.reduce((sum, tech) => sum + tech.onHold, 0),
      open: technicianStats.reduce((sum, tech) => sum + tech.open, 0),
      overdue: technicianStats.reduce((sum, tech) => sum + tech.overdue, 0),
      totalAssigned: technicianStats.reduce((sum, tech) => sum + tech.totalAssigned, 0)
    };

    technicianStats.push(totalStats);

    return NextResponse.json(technicianStats);
  } catch (error) {
    console.error('Technician stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch technician stats' }, { status: 500 });
  }
}
