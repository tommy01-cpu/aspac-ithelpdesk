const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 15 },
      select: { subject: true, content_html: true }
    });
    
    if (template) {
      console.log('=== CLARIFICATION TEMPLATE VARIABLES ===');
      const subjectVars = template.subject.match(/\$\{[^}]+\}/g) || [];
      const contentVars = template.content_html.match(/\$\{[^}]+\}/g) || [];
      const allVars = [...new Set([...subjectVars, ...contentVars])];
      
      console.log('All variables used:');
      allVars.forEach(v => console.log(' -', v));
      
      console.log('\nChecking for Request_Subject vs Request_Title:');
      const hasRequestSubject = allVars.some(v => v.includes('Request_Subject'));
      const hasRequestTitle = allVars.some(v => v.includes('Request_Title'));
      
      console.log('Uses Request_Subject:', hasRequestSubject);
      console.log('Uses Request_Title:', hasRequestTitle);
      
      if (hasRequestSubject && !hasRequestTitle) {
        console.log('\n*** ISSUE FOUND: Template uses Request_Subject but code passes Request_Title ***');
        console.log('SOLUTION: Change code to pass Request_Subject instead of Request_Title');
      } else if (hasRequestTitle && !hasRequestSubject) {
        console.log('\n*** Template correctly uses Request_Title ***');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
checkTemplate();
