const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateStatusValues() {
  try {
    console.log('🔄 Updating approval statuses to use new enum values...');

    // Update approval statuses
    const approvalUpdates = [
      { from: 'not_sent', to: 'pending_approval' },
      { from: 'pending', to: 'pending_approval' },
      { from: 'pending clarification', to: 'for_clarification' },
      { from: 'pending-clarification', to: 'for_clarification' },
      { from: 'for-clarification', to: 'for_clarification' },
      // approved and rejected should already be correct
    ];

    for (const update of approvalUpdates) {
      const result = await prisma.$executeRaw`
        UPDATE request_approvals 
        SET status = ${update.to} 
        WHERE status = ${update.from}
      `;
      console.log(`✅ Updated approval status: ${update.from} → ${update.to} (${result} records)`);
    }

    console.log('🔄 Updating request statuses to use new enum values...');

    // Update request statuses
    const requestUpdates = [
      { from: 'open', to: 'for_approval' }, // New requests start as for_approval
      { from: 'approved', to: 'open' }, // Approved requests become open for work
      { from: 'rejected', to: 'closed' }, // Rejected requests become closed
      // Other statuses (cancelled, on_hold, resolved, closed) should already be correct
    ];

    for (const update of requestUpdates) {
      const result = await prisma.$executeRaw`
        UPDATE requests 
        SET status = ${update.to} 
        WHERE status = ${update.from}
      `;
      console.log(`✅ Updated request status: ${update.from} → ${update.to} (${result} records)`);
    }

    // Verify the updates
    console.log('\n📊 Current status distribution:');
    
    const approvalStatusCounts = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM request_approvals 
      GROUP BY status 
      ORDER BY status
    `;
    console.log('Approval statuses:', approvalStatusCounts);

    const requestStatusCounts = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM requests 
      GROUP BY status 
      ORDER BY status
    `;
    console.log('Request statuses:', requestStatusCounts);

    console.log('\n✅ Status update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStatusValues();
