const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addOnHoldStatus() {
  try {
    console.log('Adding on_hold status by updating some open requests...\n');

    // Get some open requests to convert to on-hold
    const openRequests = await prisma.request.findMany({
      where: {
        status: 'open'
      },
      select: {
        id: true,
        formData: true
      },
      take: 2 // Convert 2 requests to on-hold for testing
    });

    if (openRequests.length === 0) {
      console.log('No open requests found to convert to on_hold status.');
      return;
    }

    // Update some requests to on_hold status
    console.log('Converting some requests to on_hold status:');
    for (let i = 0; i < Math.min(2, openRequests.length); i++) {
      const req = openRequests[i];
      await prisma.request.update({
        where: { id: req.id },
        data: { status: 'on_hold' }
      });
      console.log(`- Request #${req.id} updated to on_hold status`);
    }

    console.log('\nUpdated status distribution:');
    const statusCounts = await prisma.request.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    statusCounts.forEach(s => {
      console.log(`- ${s.status}: ${s._count.status} requests`);
    });

  } catch (error) {
    console.error('Error adding on-hold status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addOnHoldStatus();
