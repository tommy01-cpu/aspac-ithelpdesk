const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRequestAssignments() {
  try {
    console.log('Checking all request assignments...\n');

    // Get sample requests with assignedTechnicianId
    const requests = await prisma.request.findMany({
      select: {
        id: true,
        status: true,
        formData: true,
        createdAt: true
      },
      take: 20
    });

    console.log('Sample requests with assignments:');
    requests.forEach(req => {
      const assignedId = req.formData?.assignedTechnicianId;
      if (assignedId) {
        console.log(`- Request #${req.id}: status=${req.status}, assignedTechnicianId=${assignedId} (type: ${typeof assignedId}), created=${req.createdAt.toISOString().split('T')[0]}`);
      }
    });

    console.log('\nRequests assigned to any technician:');
    const assignedRequests = await prisma.request.findMany({
      where: {
        formData: {
          path: ['assignedTechnicianId'],
          not: null
        }
      },
      select: {
        id: true,
        status: true,
        formData: true
      },
      take: 10
    });

    assignedRequests.forEach(req => {
      console.log(`- Request #${req.id}: status=${req.status}, assignedTechnicianId=${req.formData.assignedTechnicianId}`);
    });

    console.log('\nCounting requests by assigned technician ID:');
    // Check for each technician ID
    for (let techId = 1; techId <= 5; techId++) {
      const count = await prisma.request.count({
        where: {
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: techId
              }
            },
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: techId.toString()
              }
            }
          ]
        }
      });
      console.log(`- Technician ID ${techId}: ${count} requests`);
    }

  } catch (error) {
    console.error('Error checking assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequestAssignments();
