const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDepartmentHeads() {
  console.log('=== Setting Department Heads ===');
  
  // Option 1: Set Evangeline Bugayong (ID: 6) as Finance & Admin department head
  // Option 2: Set Daisy Barquin (ID: 10) as Finance & Admin department head
  
  // Let's use Evangeline Bugayong (ID: 6) as the Finance & Admin department head
  const financeAdminDeptHeadId = 6; // Evangeline Bugayong
  
  console.log('Setting Evangeline Bugayong (ID: 6) as Finance & Admin department head...');
  
  const updateResult = await prisma.users.updateMany({
    where: { 
      department: 'Finance & Admin',
      // Don't update the department head herself
      NOT: { id: financeAdminDeptHeadId }
    },
    data: {
      departmentHeadId: financeAdminDeptHeadId
    }
  });
  
  console.log(`Updated ${updateResult.count} users in Finance & Admin department`);
  
  // Verify the changes
  console.log('\n=== Updated Finance & Admin Department Users ===');
  const financeUsers = await prisma.users.findMany({
    where: { department: 'Finance & Admin' },
    select: { 
      id: true, 
      emp_fname: true, 
      emp_lname: true, 
      emp_code: true,
      reportingToId: true,
      departmentHeadId: true
    }
  });
  console.log(financeUsers);
  
  // Check who the department head is
  console.log('\n=== Department Head Details ===');
  const deptHead = await prisma.users.findUnique({
    where: { id: financeAdminDeptHeadId },
    select: { 
      id: true, 
      emp_fname: true, 
      emp_lname: true, 
      department: true,
      emp_code: true
    }
  });
  console.log('Department Head:', deptHead);
  
  await prisma.$disconnect();
}

fixDepartmentHeads().catch(console.error);
