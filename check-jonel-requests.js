const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJonelRequests() {
  try {
    console.log('Checking all requests for Jonel Calimlim (Technician ID: 5)...\n');

    // Get all requests assigned to Jonel
    const jonelRequests = await prisma.request.findMany({
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
              equals: '5'
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total requests assigned to Jonel: ${jonelRequests.length}`);
    console.log('\nBreakdown by status:');
    
    const statusCounts = {};
    jonelRequests.forEach(req => {
      statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} requests`);
    });

    console.log('\nDetailed list:');
    jonelRequests.forEach(req => {
      console.log(`- Request #${req.id}: ${req.status} (assigned to: ${req.formData.assignedTechnicianId})`);
    });

    // Check if there are any open requests for anyone
    const openRequests = await prisma.request.count({
      where: {
        status: 'open'
      }
    });
    
    console.log(`\nTotal open requests in system: ${openRequests}`);

  } catch (error) {
    console.error('Error checking Jonel requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJonelRequests();
