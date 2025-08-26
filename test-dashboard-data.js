const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDashboardData() {
  try {
    console.log('Testing dashboard data with corrected status values...\n');

    // Test technician stats
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

    console.log('Active technicians:');
    technicians.forEach(tech => {
      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      console.log(`- ID: ${tech.id}, Name: ${techName}, User ID: ${tech.userId}`);
    });
    console.log('');

    // Test requests assigned to first technician
    if (technicians.length > 0) {
      const firstTech = technicians[0];
      const techName = firstTech.displayName || `${firstTech.user.emp_fname} ${firstTech.user.emp_lname}`.trim();
      
      console.log(`Testing requests for technician: ${techName} (ID: ${firstTech.id})`);
      
      // Count by status
      const [openCount, resolvedCount] = await Promise.all([
        prisma.request.count({
          where: {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: firstTech.id
                }
              },
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: firstTech.id.toString()
                }
              }
            ],
            status: 'open'
          }
        }),
        prisma.request.count({
          where: {
            OR: [
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: firstTech.id
                }
              },
              {
                formData: {
                  path: ['assignedTechnicianId'],
                  equals: firstTech.id.toString()
                }
              }
            ],
            status: 'resolved'
          }
        })
      ]);

      console.log(`Open requests: ${openCount}`);
      console.log(`Resolved requests: ${resolvedCount}`);
      console.log('');

      // Get sample requests
      const sampleRequests = await prisma.request.findMany({
        where: {
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: firstTech.id
              }
            },
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: firstTech.id.toString()
              }
            }
          ]
        },
        select: {
          id: true,
          status: true,
          formData: true,
          createdAt: true
        },
        take: 5
      });

      console.log('Sample requests:');
      sampleRequests.forEach(req => {
        console.log(`- Request #${req.id}: status=${req.status}, assignedTechnicianId=${req.formData.assignedTechnicianId}, created=${req.createdAt.toISOString().split('T')[0]}`);
      });
    }

    console.log('\nAll available statuses in database:');
    const statuses = await prisma.request.findMany({
      select: {
        status: true
      },
      distinct: ['status']
    });
    
    statuses.forEach(s => {
      console.log(`- ${s.status}`);
    });

  } catch (error) {
    console.error('Error testing dashboard data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardData();
