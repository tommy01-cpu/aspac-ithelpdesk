const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function convertToPhilippineTime(utcDate) {
  const philippineTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
  return philippineTime;
}

async function checkTemplate151() {
  try {
    console.log('🔍 Checking template 151 and its SLA configuration...');
    
    // Check if template 151 exists in ServiceCatalog or IncidentCatalogItem
    let template = await prisma.serviceCatalog.findUnique({
      where: { id: '151' }
    }).catch(() => null);
    
    if (!template) {
      template = await prisma.incidentCatalogItem.findUnique({
        where: { id: '151' }
      }).catch(() => null);
    }
    
    console.log('📋 Template 151:');
    console.log(template ? JSON.stringify(template, null, 2) : 'Not found');
    
    // Get the request details
    const request = await prisma.request.findUnique({
      where: { id: 191 },
      include: {
        approvals: {
          include: {
            approver: true
          }
        }
      }
    });
    
    console.log('\n📄 Request 191 details:');
    console.log('Created At:', request?.createdAt);
    console.log('Updated At:', request?.updatedAt);
    console.log('Status:', request?.status);
    
    console.log('\n📝 Approvals:');
    request?.approvals.forEach((approval, index) => {
      console.log(`${index + 1}. Level ${approval.level}: ${approval.status}`);
      console.log(`   Approver: ${approval.approver?.emp_fname} ${approval.approver?.emp_lname}`);
      console.log(`   Approved At: ${approval.approvedAt}`);
    });
    
    // Convert times to Philippine time for clarity
    if (request?.createdAt) {
      const phCreated = convertToPhilippineTime(request.createdAt);
      const phUpdated = convertToPhilippineTime(request.updatedAt);
      console.log('\n🇵🇭 Philippine Times:');
      console.log('Created At (PH):', phCreated.toLocaleString());
      console.log('Updated At (PH):', phUpdated.toLocaleString());
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate151();
