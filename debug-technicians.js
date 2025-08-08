const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicianData() {
  try {
    console.log('Checking technician data...');
    
    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        loginName: true,
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            emp_code: true,
            post_des: true,
            department: true
          }
        }
      },
      take: 5 // Just get first 5 for testing
    });
    
    console.log('Found technicians:', technicians.length);
    technicians.forEach((tech, index) => {
      console.log(`\nTechnician ${index + 1}:`);
      console.log('  ID:', tech.id);
      console.log('  DisplayName:', tech.displayName);
      console.log('  LoginName:', tech.loginName);
      console.log('  User Data:', tech.user);
      if (tech.user) {
        console.log('  Full Name from User:', `${tech.user.emp_fname || ''} ${tech.user.emp_lname || ''}`.trim());
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicianData();
