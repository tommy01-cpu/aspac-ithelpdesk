import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTechnicianData() {
  try {
    console.log('=== Technician Table Data ===');
    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
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
    
    console.log('Active technicians:', technicians.length);
    technicians.forEach(tech => {
      console.log(`ID: ${tech.id}, User ID: ${tech.userId}, Display: ${tech.displayName}, Name: ${tech.user.emp_fname} ${tech.user.emp_lname}`);
    });

    console.log('\n=== Sample Request Data ===');
    const sampleRequests = await prisma.formData.findMany({
      where: {
        assignedTechnicianId: {
          not: null
        }
      },
      select: {
        id: true,
        assignedTechnicianId: true,
        status: true
      },
      take: 5
    });

    console.log('Sample requests with assigned technicians:');
    sampleRequests.forEach(req => {
      console.log(`Request ID: ${req.id}, Assigned Tech ID: ${req.assignedTechnicianId}, Status: ${req.status}`);
    });

    console.log('\n=== Technician Assignments Count ===');
    for (const tech of technicians) {
      const count = await prisma.formData.count({
        where: {
          assignedTechnicianId: tech.id
        }
      });
      console.log(`${tech.displayName || tech.user.emp_fname + ' ' + tech.user.emp_lname}: ${count} requests`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTechnicianData();
