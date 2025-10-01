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
      // Still calculate unassigned requests - only check assignedTechnicianId
      const [unassignedOnHold, unassignedOpen, unassignedOverdue] = await Promise.all([
        prisma.request.count({
          where: {
            status: 'on_hold',
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
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
        }),

        prisma.request.count({
          where: {
            status: 'open',
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
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
        }),

        // Unassigned overdue
        prisma.request.count({
          where: {
            status: {
              in: ['open', 'on_hold']
            },
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
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
            ],
            AND: [
              {
                formData: {
                  path: ['slaDueDate'],
                  lt: new Date().toISOString()
                }
              }
            ]
          }
        })
      ]);

      const result = [];
      
      if (unassignedOnHold > 0 || unassignedOpen > 0 || unassignedOverdue > 0) {
        result.push({
          id: 0,
          name: 'Unassigned',
          onHold: unassignedOnHold,
          open: unassignedOpen,
          overdue: unassignedOverdue,
          totalAssigned: unassignedOnHold + unassignedOpen
        });
      }

      // Add totals
      result.push({
        id: -999,
        name: 'Total',
        onHold: unassignedOnHold,
        open: unassignedOpen,
        overdue: unassignedOverdue,
        totalAssigned: unassignedOnHold + unassignedOpen
      });

      return NextResponse.json(result);
    }

    // Calculate stats for each technician - only use assignedTechnicianId
    const technicianStats = await Promise.all(
      technicians.map(async (tech) => {
        const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
        
        // Count requests by status for this technician using only assignedTechnicianId
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
                }
              ],
              status: 'open'
            }
          }),
          
          // Overdue requests (past due date based on SLA)
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
                }
              ],
              status: {
                in: ['open', 'on_hold']
              },
              AND: [
                {
                  formData: {
                    path: ['slaDueDate'],
                    lt: new Date().toISOString()
                  }
                }
              ]
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

    // Add "Others" category for requests assigned to users not in technicians list - only check assignedTechnicianId
    const [othersOnHold, othersOpen, othersOverdue] = await Promise.all([
      prisma.request.count({
        where: {
          status: 'on_hold',
          NOT: {
            OR: technicians.flatMap(tech => [
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
              }
            ])
          },
          formData: {
            path: ['assignedTechnicianId'],
            not: Prisma.JsonNull
          }
        }
      }),

      prisma.request.count({
        where: {
          status: 'open',
          NOT: {
            OR: technicians.flatMap(tech => [
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
              }
            ])
          },
          formData: {
            path: ['assignedTechnicianId'],
            not: Prisma.JsonNull
          }
        }
      }),

      // Others overdue
      prisma.request.count({
        where: {
          status: {
            in: ['open', 'on_hold']
          },
          NOT: {
            OR: technicians.flatMap(tech => [
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
              }
            ])
          },
          formData: {
            path: ['assignedTechnicianId'],
            not: Prisma.JsonNull
          },
          AND: [
            {
              formData: {
                path: ['slaDueDate'],
                lt: new Date().toISOString()
              }
            }
          ]
        }
      })
    ]);

    // Add "Unassigned" category - only check assignedTechnicianId
    const [unassignedOnHold, unassignedOpen, unassignedOverdue] = await Promise.all([
      prisma.request.count({
        where: {
          status: 'on_hold',
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
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
      }),

      prisma.request.count({
        where: {
          status: 'open',
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
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
      }),

      // Unassigned overdue
      prisma.request.count({
        where: {
          status: {
            in: ['open', 'on_hold']
          },
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
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
          ],
          AND: [
            {
              formData: {
                path: ['slaDueDate'],
                lt: new Date().toISOString()
              }
            }
          ]
        }
      })
    ]);

    // Add summary rows
    if (othersOnHold > 0 || othersOpen > 0 || othersOverdue > 0) {
      technicianStats.push({
        id: -1,
        name: 'Others',
        onHold: othersOnHold,
        open: othersOpen,
        overdue: othersOverdue,
        totalAssigned: othersOnHold + othersOpen
      });
    }

    if (unassignedOnHold > 0 || unassignedOpen > 0 || unassignedOverdue > 0) {
      technicianStats.push({
        id: 0,
        name: 'Unassigned',
        onHold: unassignedOnHold,
        open: unassignedOpen,
        overdue: unassignedOverdue,
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
