const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRequests() {
  try {
    const count = await prisma.request.count();
    console.log('Total requests in database:', count);
    
    if (count > 0) {
      const sampleRequests = await prisma.request.findMany({
        take: 3,
        include: {
          user: {
            select: {
              emp_fname: true,
              emp_lname: true,
              emp_email: true
            }
          }
        }
      });
      
      console.log('\nSample requests:');
      sampleRequests.forEach(req => {
        console.log(`- ID: ${req.id}, Status: ${req.status}, User: ${req.user?.emp_fname} ${req.user?.emp_lname}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequests();
