const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicianMapping() {
  try {
    // Check if technician ID 1 exists
    const technician = await prisma.technician.findFirst({
      where: { userId: 1 },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    if (technician) {
      console.log('Technician found:');
      console.log('ID:', technician.id);
      console.log('User ID:', technician.userId);
      console.log('Display Name:', technician.displayName);
      console.log('User:', `${technician.user.emp_fname} ${technician.user.emp_lname}`);
    } else {
      console.log('No technician found for user ID 1');
      
      // Check if user 1 exists
      const user = await prisma.users.findUnique({
        where: { id: 1 },
        select: {
          id: true,
          emp_fname: true,
          emp_lname: true,
          isTechnician: true
        }
      });
      
      if (user) {
        console.log('User found:', `${user.emp_fname} ${user.emp_lname}`, 'isTechnician:', user.isTechnician);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicianMapping();
