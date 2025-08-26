const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStatusConsistency() {
  try {
    console.log('=== CHECKING REQUEST STATUS CONSISTENCY ===\n');

    // 1. Get all unique status values in the database
    console.log('1. ALL UNIQUE STATUS VALUES IN DATABASE:');
    const uniqueStatuses = await prisma.request.findMany({
      select: {
        status: true
      },
      distinct: ['status']
    });
    
    console.log('Found status values:');
    uniqueStatuses.forEach(s => {
      console.log(`   - "${s.status}"`);
    });
    console.log('');

    // 2. Count requests by status
    console.log('2. REQUEST COUNT BY STATUS:');
    for (const statusObj of uniqueStatuses) {
      const count = await prisma.request.count({
        where: {
          status: statusObj.status
        }
      });
      console.log(`   - "${statusObj.status}": ${count} requests`);
    }
    console.log('');

    // 3. Check for any null or empty status values
    console.log('3. CHECKING FOR NULL/EMPTY STATUS VALUES:');
    const nullStatus = await prisma.request.count({
      where: {
        OR: [
          { status: null },
          { status: '' },
          { status: undefined }
        ]
      }
    });
    console.log(`   - NULL/Empty status count: ${nullStatus}`);
    console.log('');

    // 4. Sample recent requests with their status
    console.log('4. RECENT REQUESTS WITH STATUS (last 10):');
    const recentRequests = await prisma.request.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
        formData: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    recentRequests.forEach(req => {
      const assignedTo = req.formData?.assignedTechnicianId || 'unassigned';
      console.log(`   - Request #${req.id}: status="${req.status}", assigned=${assignedTo}, created=${req.createdAt.toISOString().split('T')[0]}`);
    });
    console.log('');

    // 5. Check what statuses are expected in the application
    console.log('5. STATUS VALUES USED IN APPLICATION CODE:');
    console.log('   Based on code analysis, expected statuses:');
    console.log('   - "open" (active requests)');
    console.log('   - "resolved" (completed requests)');
    console.log('   - "on-hold" (waiting/clarification needed)');
    console.log('   - "pending" (awaiting approval/assignment)');
    console.log('   - "in-progress" (being worked on)');
    console.log('   - "closed" (archived/final)');
    console.log('');

    // 6. Check for case sensitivity issues
    console.log('6. CHECKING FOR CASE SENSITIVITY ISSUES:');
    const caseVariants = ['Open', 'OPEN', 'Resolved', 'RESOLVED', 'Pending', 'PENDING'];
    for (const variant of caseVariants) {
      const count = await prisma.request.count({
        where: {
          status: variant
        }
      });
      if (count > 0) {
        console.log(`   - Found "${variant}": ${count} requests (case mismatch!)`);
      }
    }
    console.log('');

    // 7. Recommendations
    console.log('7. RECOMMENDATIONS:');
    const actualStatuses = uniqueStatuses.map(s => s.status);
    
    if (actualStatuses.length === 2 && actualStatuses.includes('open') && actualStatuses.includes('resolved')) {
      console.log('   ✅ Database has consistent status values: "open" and "resolved"');
      console.log('   📝 Consider if you need additional statuses like:');
      console.log('      - "on-hold" for requests waiting for clarification');
      console.log('      - "pending" for requests awaiting assignment');
      console.log('      - "in-progress" for requests being actively worked on');
    } else {
      console.log('   ⚠️  Status values may need standardization');
      console.log('   📝 Consider migrating to a standard set of statuses');
    }

  } catch (error) {
    console.error('Error checking status consistency:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatusConsistency();
