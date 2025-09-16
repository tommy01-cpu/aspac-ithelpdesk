const { PrismaClient } = require('@prisma/client');

async function checkUserOrder() {
  const prisma = new PrismaClient();
  
  try {
    // Get users ordered by emp_fname like the API does
    const users = await prisma.users.findMany({ 
      orderBy: { emp_fname: 'asc' }, 
      select: { 
        id: true, 
        emp_fname: true, 
        emp_lname: true 
      } 
    });
    
    console.log('First 55 users ordered by emp_fname:');
    users.slice(0, 55).forEach((u, i) => 
      console.log(`${i+1}. ${u.emp_fname} ${u.emp_lname} (ID: ${u.id})`)
    );
    
    const robertIndex = users.findIndex(u => 
      u.emp_fname?.toLowerCase().includes('robert')
    );
    
    console.log(`\nRobert Baluyot is at position: ${robertIndex + 1}`);
    console.log(`Total users: ${users.length}`);
    
    // Check what happens with limit 50
    const limitedUsers = users.slice(0, 50);
    const robertInLimited = limitedUsers.findIndex(u => 
      u.emp_fname?.toLowerCase().includes('robert')
    );
    
    console.log(`\nWith limit 50:`);
    console.log(`Robert Baluyot included: ${robertInLimited !== -1 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserOrder();
