const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicians() {
  try {
    console.log('=== GETTING TECHNICIAN USERS WITH CORRECT RELATIONS ===');
    
    // Let's try using userDepartment instead of department
    const users = await prisma.users.findMany({
      where: {
        emp_status: 'active',
        technician: {
          isActive: true
        }
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        emp_code: true,
        post_des: true,
        userDepartment: {
          select: {
            name: true
          }
        },
        technician: {
          select: {
            id: true,
            isActive: true,
            isAdmin: true
          }
        }
      },
      orderBy: [
        { emp_fname: 'asc' },
        { emp_lname: 'asc' }
      ]
    });
    
    console.log(`Found ${users.length} active technician users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.emp_fname} ${user.emp_lname} (${user.emp_code})`);
      console.log(`   Email: ${user.emp_email}`);
      console.log(`   Position: ${user.post_des || 'N/A'}`);
      console.log(`   Department: ${user.userDepartment?.name || 'N/A'}`);
      console.log(`   Technician ID: ${user.technician?.id}`);
      console.log(`   Is Admin: ${user.technician?.isAdmin || false}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('Error checking technicians:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicians();
