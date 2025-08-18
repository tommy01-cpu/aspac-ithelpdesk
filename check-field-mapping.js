const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFieldMapping() {
  try {
    // Get a request with its template to understand field mapping
    const request = await prisma.request.findFirst({
      where: { userId: 1 },
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
    
    if (request) {
      console.log('Request Details:');
      console.log('ID:', request.id);
      console.log('Template ID:', request.templateId);
      console.log('Template Name:', request.templateName);
      console.log('User:', `${request.user.emp_fname} ${request.user.emp_lname}`);
      console.log('\nFormData structure:');
      
      const formData = request.formData || {};
      for (const [key, value] of Object.entries(formData)) {
        console.log(`  Field ${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
      }
      
      // Get the template to see field definitions
      const template = await prisma.template.findUnique({
        where: { id: parseInt(request.templateId) },
        select: {
          id: true,
          name: true,
          fields: true
        }
      });
      
      if (template) {
        console.log('\nTemplate Fields Definition:');
        const fields = template.fields || [];
        if (Array.isArray(fields)) {
          fields.forEach((field, index) => {
            console.log(`  Field ${index + 1} (${field.id}): ${field.label} - Type: ${field.type}`);
            if (field.type === 'editable-name-select') {
              console.log(`    Options:`, field.options);
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFieldMapping();
