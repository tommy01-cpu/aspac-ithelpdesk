const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUpdatedAPI() {
  try {
    console.log('=== TESTING UPDATED API LOGIC ===\n');

    // Get technicians and their stats (matching the API logic)
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

    console.log('Testing technician stats with on-hold/open/overdue logic:\n');

    for (const tech of technicians) {
      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      
      const [onHold, open, overdue] = await Promise.all([
        // On-hold requests
        prisma.request.count({
          where: {
            OR: [
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
              }
            ],
            status: 'on-hold'
          }
        }),
        
        // Open requests
        prisma.request.count({
          where: {
            OR: [
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
              }
            ],
            status: 'open'
          }
        }),
        
        // Overdue requests (older than 3 days)
        prisma.request.count({
          where: {
            OR: [
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
              }
            ],
            status: 'open',
            createdAt: {
              lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            }
          }
        })
      ]);

      const totalAssigned = onHold + open;
      
      console.log(`${techName} (ID: ${tech.id}):`);
      console.log(`  - On-Hold: ${onHold}`);
      console.log(`  - Open: ${open}`);
      console.log(`  - Overdue: ${overdue}`);
      console.log(`  - Total Active: ${totalAssigned}`);
      console.log('');
    }

    // Test "My Assigned Requests" logic for Jonel (ID: 5)
    console.log('=== MY ASSIGNED REQUESTS TEST (for Jonel - ID: 5) ===');
    const myAssignedRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: 5
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: "5"
            }
          }
        ],
        status: {
          in: ['open', 'on-hold'] // Only active statuses
        }
      }
    });

    console.log(`Jonel's "My Assigned Requests" count: ${myAssignedRequests}`);
    console.log('(This should show 1 if you are logged in as Jonel)');

  } catch (error) {
    console.error('Error testing updated API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedAPI();
