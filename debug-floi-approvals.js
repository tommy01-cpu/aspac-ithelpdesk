const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFloiApprovals() {
  try {
    console.log('🔍 DEBUG: Searching for Floi Neri approvals...\n');
    
    // 1. Find Floi Neri user
    console.log('1️⃣ Searching for Floi Neri user...');
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { emp_fname: { contains: 'Floi', mode: 'insensitive' } },
          { emp_lname: { contains: 'Neri', mode: 'insensitive' } },
          { emp_email: { contains: 'floi', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true
      }
    });

    console.log(`Found ${users.length} users matching "Floi Neri":`);
    users.forEach(user => {
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.emp_fname} ${user.emp_lname}`);
      console.log(`  Email: ${user.emp_email}`);
      console.log('');
    });

    if (users.length === 0) {
      console.log('❌ No Floi Neri user found in database');
      return;
    }

    const floiUser = users[0];
    console.log(`✅ Using user: ${floiUser.emp_fname} ${floiUser.emp_lname} (ID: ${floiUser.id})\n`);

    // 2. Check all approvals for this user
    console.log('2️⃣ Checking all approvals for Floi Neri...');
    const allApprovals = await prisma.requestApproval.findMany({
      where: { approverId: floiUser.id },
      include: {
        request: {
          select: { 
            id: true, 
            templateName: true, 
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { requestId: 'desc' },
        { level: 'asc' }
      ]
    });

    console.log(`Total approvals found: ${allApprovals.length}\n`);

    if (allApprovals.length === 0) {
      console.log('❌ No approvals found for Floi Neri');
      return;
    }

    allApprovals.forEach((approval, idx) => {
      console.log(`Approval ${idx + 1}:`);
      console.log(`  Request: #${approval.requestId} - ${approval.request?.templateName}`);
      console.log(`  Level: ${approval.level}`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  Name: ${approval.name}`);
      console.log(`  Created: ${approval.createdAt}`);
      console.log(`  Updated: ${approval.updatedAt}`);
      console.log('');
    });

    // 3. Check specifically for level 1 for_clarification
    console.log('3️⃣ Checking for Level 1 "for_clarification" approvals...');
    const level1Clarifications = allApprovals.filter(a => 
      a.level === 1 && a.status === 'for_clarification'
    );

    console.log(`Level 1 for_clarification count: ${level1Clarifications.length}\n`);

    level1Clarifications.forEach((approval, idx) => {
      console.log(`Level 1 Clarification ${idx + 1}:`);
      console.log(`  Request ID: ${approval.requestId}`);
      console.log(`  Approval ID: ${approval.id}`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  Level: ${approval.level}`);
      console.log(`  Name: ${approval.name}`);
      console.log('');
    });

    // 4. Check if these should appear in pending approvals API
    if (level1Clarifications.length > 0) {
      console.log('4️⃣ Testing pending approvals API logic...');
      
      for (const approval of level1Clarifications) {
        console.log(`\nTesting Request #${approval.requestId}, Level ${approval.level}:`);
        
        // Check if all previous levels are approved (for level 1, there are no previous)
        const previousLevels = await prisma.requestApproval.findMany({
          where: {
            requestId: approval.requestId,
            level: { lt: approval.level }
          }
        });

        console.log(`  Previous levels: ${previousLevels.length}`);
        
        const allPreviousApproved = previousLevels.length === 0 || 
          previousLevels.every(prev => prev.status === 'approved');
        
        console.log(`  All previous approved: ${allPreviousApproved}`);
        console.log(`  Should appear in pending: ${allPreviousApproved ? '✅ YES' : '❌ NO'}`);
        
        if (previousLevels.length > 0) {
          console.log(`  Previous level statuses:`);
          previousLevels.forEach(prev => {
            console.log(`    Level ${prev.level}: ${prev.status}`);
          });
        }
      }
    }

    // 5. Check current session user email for testing
    console.log('\n5️⃣ IMPORTANT: Check your login email...');
    console.log(`Floi Neri's email: ${floiUser.emp_email}`);
    console.log('Make sure you are logged in with this email to see the approvals!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFloiApprovals();
