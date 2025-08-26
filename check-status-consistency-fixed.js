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

    // 3. Sample recent requests with their status
    console.log('3. RECENT REQUESTS WITH STATUS (last 15):');
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
      take: 15
    });

    recentRequests.forEach(req => {
      const assignedTo = req.formData?.assignedTechnicianId || 'unassigned';
      console.log(`   - Request #${req.id}: status="${req.status}", assigned=${assignedTo}, created=${req.createdAt.toISOString().split('T')[0]}`);
    });
    console.log('');

    // 4. Check what statuses are expected in the application
    console.log('4. STATUS VALUES TYPICALLY USED IN HELPDESK SYSTEMS:');
    console.log('   - "open" (new/active requests)');
    console.log('   - "on-hold" (waiting for clarification/approval)');
    console.log('   - "in-progress" (being actively worked on)');
    console.log('   - "pending" (awaiting assignment/resources)');
    console.log('   - "resolved" (completed, solution provided)');
    console.log('   - "closed" (final state, archived)');
    console.log('');

    // 5. Current database analysis
    console.log('5. CURRENT DATABASE STATUS ANALYSIS:');
    const actualStatuses = uniqueStatuses.map(s => s.status);
    
    if (actualStatuses.length === 2 && actualStatuses.includes('open') && actualStatuses.includes('resolved')) {
      console.log('   ✅ Database currently uses simplified 2-status system:');
      console.log('      - "open" = active requests (needs work)');
      console.log('      - "resolved" = completed requests');
      console.log('');
      console.log('   📝 RECOMMENDATIONS:');
      console.log('      Option 1: Keep simple 2-status system');
      console.log('      Option 2: Add intermediate statuses for better workflow:');
      console.log('         - "on-hold" for requests waiting for user input');
      console.log('         - "in-progress" for requests being actively worked');
      console.log('         - "pending" for requests awaiting assignment');
    } else {
      console.log('   ⚠️  Unexpected status values found');
    }
    console.log('');

    // 6. Check assigned requests by technician and status
    console.log('6. REQUESTS BY TECHNICIAN AND STATUS:');
    
    // Get all technicians
    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    for (const tech of technicians) {
      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      
      const openCount = await prisma.request.count({
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
      });

      const resolvedCount = await prisma.request.count({
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
      });

      if (openCount > 0 || resolvedCount > 0) {
        console.log(`   - ${techName}: ${openCount} open, ${resolvedCount} resolved`);
      }
    }

  } catch (error) {
    console.error('Error checking status consistency:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatusConsistency();
