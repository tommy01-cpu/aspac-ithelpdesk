const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTechnicianApi() {
  try {
    // Test the data transformation logic
    const requests = await prisma.request.findMany({
      orderBy: {
        createdAt: 'desc'
      },
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

    console.log(`Found ${requests.length} requests`);

    // Transform data for frontend
    const transformedRequests = requests.map(request => {
      const formData = request.formData;
      console.log(`Request ${request.id} formData:`, formData);
      
      return {
        id: request.id,
        title: formData?.['8'] || formData?.issueTitle || formData?.subject || 'No title',
        subject: formData?.['8'] || formData?.issueTitle || formData?.subject || 'No title',
        description: formData?.['9'] || formData?.issueDescription || formData?.description || '',
        requester: `${request.user?.emp_fname || ''} ${request.user?.emp_lname || ''}`.trim(),
        requesterEmail: request.user?.emp_email || '',
        priority: formData?.['2'] || formData?.priority || 'medium',
        status: request.status,
        category: formData?.['6'] || formData?.category || 'General',
        assignedTechnician: formData?.assignedTechnician || null,
        assignedTo: formData?.assignedTechnician || 'Unassigned',
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        dueDate: formData?.slaDueDate || formData?.dueDate || formData?.slaDetails?.dueDate || null,
        site: formData?.site || formData?.location || null
      };
    });

    console.log('\nTransformed requests:');
    transformedRequests.forEach(req => {
      console.log(`- ID: ${req.id}, Subject: "${req.subject}", Requester: ${req.requester}, Status: ${req.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTechnicianApi();
