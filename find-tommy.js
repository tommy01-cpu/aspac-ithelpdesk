const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findTommy() {
  try {
    console.log('Finding Tommy in the database...\n');

    // Find all technicians to see the exact names
    const technicians = await prisma.technician.findMany({
      select: {
        id: true,
        displayName: true,
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

    console.log('All technicians:');
    technicians.forEach(tech => {
      console.log(`- ID: ${tech.id}, Display: "${tech.displayName}", First: "${tech.user.emp_fname}", Last: "${tech.user.emp_lname}", Email: ${tech.user.emp_email}`);
    });

    // Find Tommy by user ID 1 (from our previous check)
    const tommy = await prisma.technician.findFirst({
      where: {
        userId: 1
      },
      select: {
        id: true,
        displayName: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    if (tommy) {
      console.log(`\nFound Tommy by User ID: ${JSON.stringify(tommy, null, 2)}`);
    } else {
      console.log('\nTommy not found by User ID 1');
    }

  } catch (error) {
    console.error('Error finding Tommy:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTommy();
