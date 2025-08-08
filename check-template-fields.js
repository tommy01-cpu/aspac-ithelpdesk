const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplateFields() {
  try {
    console.log('🔍 Checking template fields in database...');
    
    // Find templates with "Temporary Loan" in the name
    const templates = await prisma.template.findMany({
      where: {
        name: {
          contains: 'Temporary Loan'
        }
      },
      select: {
        id: true,
        name: true,
        fields: true
      }
    });

    console.log(`📋 Found ${templates.length} matching templates`);

    for (const template of templates) {
      console.log(`\n🔍 Template: "${template.name}" (ID: ${template.id})`);
      console.log('📄 Fields type:', typeof template.fields);
      console.log('📄 Fields isArray:', Array.isArray(template.fields));
      
      if (typeof template.fields === 'string') {
        try {
          const parsed = JSON.parse(template.fields);
          console.log('✅ Parsed fields count:', Array.isArray(parsed) ? parsed.length : 'Not an array');
          console.log('📋 First few fields:', JSON.stringify(parsed.slice(0, 3), null, 2));
        } catch (error) {
          console.log('❌ Failed to parse fields JSON:', error.message);
        }
      } else if (Array.isArray(template.fields)) {
        console.log('✅ Direct array, fields count:', template.fields.length);
        console.log('📋 First few fields:', JSON.stringify(template.fields.slice(0, 3), null, 2));
      } else {
        console.log('❌ Fields is neither string nor array:', template.fields);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateFields();
