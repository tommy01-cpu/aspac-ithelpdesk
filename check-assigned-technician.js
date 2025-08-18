const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssignedTechnicianData() {
  try {
    const requests = await prisma.request.findMany({
      where: { userId: 1 },
      take: 3,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true
          }
        }
      }
    });
    
    for (const request of requests) {
      console.log(`\n=== Request ${request.id} ===`);
      console.log('Template:', request.templateName);
      console.log('User:', `${request.user.emp_fname} ${request.user.emp_lname}`);
      
      const formData = request.formData || {};
      console.log('\nFormData assigned technician fields:');
      console.log('  assignedTechnician:', formData.assignedTechnician);
      console.log('  assignedTechnicianId:', formData.assignedTechnicianId);
      console.log('  field 7:', formData['7']);
      
      // Check if there's actually an assigned technician
      let technicianUserId = null;
      if (formData.assignedTechnicianId) {
        technicianUserId = parseInt(formData.assignedTechnicianId);
      } else if (formData['7']) {
        technicianUserId = parseInt(formData['7']);
      }
      
      if (technicianUserId && !isNaN(technicianUserId)) {
        const technician = await prisma.technician.findFirst({
          where: { userId: technicianUserId },
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
          console.log('\nFound assigned technician:');
          console.log('  ID:', technician.id);
          console.log('  User ID:', technician.userId);
          console.log('  Display Name:', technician.displayName);
          console.log('  Full Name:', `${technician.user.emp_fname} ${technician.user.emp_lname}`);
        } else {
          console.log(`\nNo technician found for user ID: ${technicianUserId}`);
        }
      } else {
        console.log('\nNo technician assigned (no valid ID found)');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssignedTechnicianData();
