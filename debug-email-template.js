const { prisma } = require('./lib/prisma.ts');

async function main() {
  try {
    console.log('🔍 Checking REQUEST_CREATED_REQUESTER email template...');
    
    const template = await prisma.email_Template.findFirst({
      where: { type: 'REQUEST_CREATED_REQUESTER' }
    });
    
    if (!template) {
      console.log('❌ No template found for REQUEST_CREATED_REQUESTER');
      return;
    }
    
    console.log('✅ Template found:');
    console.log('- ID:', template.id);
    console.log('- Name:', template.name);
    console.log('- Active:', template.is_active);
    console.log('- Contains Request_Description variable:', template.html_content.includes('Request_Description'));
    console.log('- Contains ${Request_Description}:', template.html_content.includes('${Request_Description}'));
    
    // Look for the description variable pattern
    const descriptionMatches = template.html_content.match(/\$\{[^}]*Request_Description[^}]*\}/gi);
    console.log('- Description variable patterns found:', descriptionMatches);
    
    console.log('\n📄 Full HTML template:');
    console.log(template.html_content);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
