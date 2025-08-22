const { getEmailTemplateById } = require('./lib/database-email-templates');

async function testTemplateRetrieval() {
  console.log('Testing template retrieval...');
  
  try {
    const template = await getEmailTemplateById(10);
    if (template) {
      console.log('✅ Template retrieved successfully!');
      console.log('Template details:', {
        id: template.id,
        title: template.title,
        subject: template.subject,
        is_active: template.is_active
      });
    } else {
      console.log('❌ Template not found or inactive');
    }
  } catch (error) {
    console.error('❌ Error retrieving template:', error.message);
  }
}

testTemplateRetrieval();
