const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRequestData() {
  try {
    const request = await prisma.request.findFirst({
      where: { userId: 1 },
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
    
    if (request) {
      console.log('Sample Request Data:');
      console.log('ID:', request.id);
      console.log('UserId:', request.userId);
      console.log('User:', request.user);
      console.log('AssignedTo field:', request.assignedTo);
      console.log('FormData keys:', Object.keys(request.formData || {}));
      console.log('FormData structure:');
      
      const formData = request.formData || {};
      for (const [key, value] of Object.entries(formData)) {
        console.log(`  ${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
      }
      
      // Check for different name fields
      const possibleNameFields = ['name', 'requester', 'requesterName', 'emp_fname', 'emp_lname'];
      console.log('\nPossible name/requester fields in formData:');
      possibleNameFields.forEach(field => {
        if (formData[field]) {
          console.log(`  ${field}:`, formData[field]);
        }
      });
      
    } else {
      console.log('No requests found');
    }
    
    // Check if there are assigned technicians
    const assignedRequests = await prisma.request.findMany({
      where: {
        assignedTo: { not: null }
      },
      select: {
        id: true,
        assignedTo: true,
        formData: true
      },
      take: 3
    });
    
    console.log('\nRequests with assigned technicians:');
    assignedRequests.forEach(req => {
      console.log(`Request ${req.id}: assignedTo = ${req.assignedTo}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequestData();
