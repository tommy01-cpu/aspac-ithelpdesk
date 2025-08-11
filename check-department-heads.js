const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('=== Current User (Angelbert) ===');
  const user = await prisma.users.findUnique({
    where: { id: 3 },
    select: { 
      id: true, 
      emp_fname: true, 
      emp_lname: true, 
      department: true, 
      reportingToId: true, 
      departmentHeadId: true 
    }
  });
  console.log(user);
  
  console.log('\n=== All Users (to find suitable department head) ===');
  const users = await prisma.users.findMany({
    select: { 
      id: true, 
      emp_fname: true, 
      emp_lname: true, 
      department: true, 
      emp_code: true
    }
  });
  console.log(users);
  
  console.log('\n=== Finance & Admin Department Users ===');
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
  
  await prisma.$disconnect();
}

checkUsers().catch(console.error);
