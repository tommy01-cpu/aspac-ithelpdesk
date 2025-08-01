import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        emp_code: true,
      }
    });

    console.log('Users in database:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.emp_fname} ${user.emp_lname}, Email: ${user.emp_email}, Code: ${user.emp_code}`);
    });

    // Check requests
    const requests = await prisma.request.findMany({
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          }
        }
      }
    });

    console.log('\nRequests in database:');
    requests.forEach(req => {
      console.log(`ID: ${req.id}, User: ${req.user.emp_fname} ${req.user.emp_lname}, Type: ${req.type}, Status: ${req.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
