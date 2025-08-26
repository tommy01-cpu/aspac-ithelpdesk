const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRequestStatuses() {
  try {
    console.log('Checking all available request statuses...\n');

    // Get all unique statuses
    const statuses = await prisma.request.findMany({
      select: {
        status: true
      },
      distinct: ['status']
    });
    
    console.log('Available statuses:');
    statuses.forEach(s => {
      console.log(`- ${s.status}`);
    });

    // Count requests by status
    console.log('\nRequest counts by status:');
    for (const statusObj of statuses) {
      const count = await prisma.request.count({
        where: {
          status: statusObj.status
        }
      });
      console.log(`- ${statusObj.status}: ${count} requests`);
    }

    // Check if there are any requests that might represent "on-hold" status
    console.log('\nChecking formData for potential on-hold indicators...');
    
    const sampleRequests = await prisma.request.findMany({
      select: {
        id: true,
        status: true,
        formData: true
      },
      take: 10
    });

    sampleRequests.forEach(req => {
      // Look for any fields that might indicate on-hold status
      const formData = req.formData || {};
      const keys = Object.keys(formData);
      console.log(`Request #${req.id} (${req.status}): ${keys.join(', ')}`);
    });

  } catch (error) {
    console.error('Error checking statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequestStatuses();
