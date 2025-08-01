import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserById() {
  try {
    // Check if user ID 1 exists
    const user1 = await prisma.users.findUnique({
      where: { id: 1 }
    });

    if (user1) {
      console.log('User ID 1 exists:', user1);
      
      // Update user ID 1 to match session data
      const updatedUser = await prisma.users.update({
        where: { id: 1 },
        data: {
          emp_fname: 'JOSE TOMMY',
          emp_lname: 'MANDAPAT',
          emp_email: 'tom.mandapat@aspacphils.com.ph',
          emp_code: 'A24026',
          post_des: 'SOFTWARE DEVELOPER',
          department: 'Information Technology',
          reportingToId: 2, // Jane Smith
          departmentHeadId: 3, // Alice Johnson
        }
      });
      
      console.log('Updated user ID 1:', updatedUser);
    } else {
      console.log('User ID 1 does not exist');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserById();
