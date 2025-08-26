const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Test technician stats API logic
    console.log('Testing technician stats API logic...\n');

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

    // Calculate stats for each technician
    const technicianStats = await Promise.all(
      technicians.map(async (tech) => {
        const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
        
        const [resolved, open, overdue] = await Promise.all([
          // Resolved requests
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
              status: 'resolved'
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

        const totalAssigned = resolved + open;

        return {
          id: tech.id,
          name: techName,
          resolved,
          open,
          overdue,
          totalAssigned
        };
      })
    );

    console.log('Technician Stats Results:');
    technicianStats.forEach(tech => {
      console.log(`${tech.name}: resolved=${tech.resolved}, open=${tech.open}, overdue=${tech.overdue}, total=${tech.totalAssigned}`);
    });

  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
