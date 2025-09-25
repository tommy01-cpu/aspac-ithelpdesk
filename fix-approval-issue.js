const { PrismaClient } = require('@prisma/client');

async function fixApprovalData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Analyzing the issue with request 111 approvals...');
    
    // The data shows:
    // - Robert Baluyot: ID 9
    // - Jose Tommy Mandapat: ID 1
    // - Both Level 1 and Level 2 approvals have approverId: 9
    
    console.log('\n📊 Current situation:');
    console.log('- Robert Baluyot (ID: 9) should be the approver');
    console.log('- But API shows Jose Tommy Mandapat for both levels');
    console.log('- Both approval records have approverId: 9 (Robert\'s ID)');
    console.log('\n🤔 This suggests the Prisma relation is not working correctly');
    
    // Test the relation directly
    console.log('\n🧪 Testing Prisma relation...');
    
    const approval = await prisma.requestApproval.findUnique({
      where: { id: 226 }, // Level 1 approval with approverId: 9
      include: {
        approver: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    console.log('\nApproval 226 with relation:');
    console.log('ApproverId:', approval?.approverId);
    console.log('Approver relation:', approval?.approver);
    
    // Direct user lookup
    const user = await prisma.users.findUnique({
      where: { id: 9 },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true
      }
    });
    
    console.log('\nDirect user lookup for ID 9:');
    console.log(user);
    
    // Check if there's a backup approver active
    const backupConfigs = await prisma.backupApprovers.findMany({
      where: {
        originalApproverId: 9, // Robert's ID
        isActive: true
      },
      include: {
        backupApprover: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    console.log('\n🔄 Active backup approver configs for Robert (ID: 9):');
    console.log(backupConfigs);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixApprovalData();