const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Searching for Robert Baluyot...');
    
    // Search for Robert Baluyot by name
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { emp_fname: { contains: 'robert', mode: 'insensitive' } },
          { emp_lname: { contains: 'baluyot', mode: 'insensitive' } },
          { emp_fname: { contains: 'baluyot', mode: 'insensitive' } },
          { emp_lname: { contains: 'robert', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        isServiceApprover: true,
        emp_status: true
      }
    });

    console.log(`Found ${users.length} users matching the search:`);
    users.forEach(user => {
      console.log(`- ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
      console.log(`  Email: ${user.emp_email || 'No email'}`);
      console.log(`  Department: ${user.department || 'No department'}`);
      console.log(`  Is Service Approver: ${user.isServiceApprover}`);
      console.log(`  Status: ${user.emp_status}`);
      console.log('');
    });

    // Also show all users with isServiceApprover = true
    console.log('\n📋 Users with isServiceApprover = true:');
    const approvers = await prisma.users.findMany({
      where: {
        isServiceApprover: true
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        emp_status: true
      }
    });

    approvers.forEach(user => {
      console.log(`- ${user.emp_fname} ${user.emp_lname} (ID: ${user.id}) - ${user.emp_status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
