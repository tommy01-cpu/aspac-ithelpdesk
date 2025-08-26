const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 15 },
      select: { subject: true, content_html: true }
    });
    
    if (template) {
      const allVars = [...template.subject.match(/\$\{[^}]+\}/g) || [], ...template.content_html.match(/\$\{[^}]+\}/g) || []];
      const uniqueVars = [...new Set(allVars)];
      console.log('Template variables:');
      uniqueVars.forEach(v => console.log(v));
      
      const hasRequestTitle = uniqueVars.some(v => v.includes('Request_Title'));
      const hasRequestSubject = uniqueVars.some(v => v.includes('Request_Subject'));
      
      console.log('\nResult:');
      if (hasRequestTitle && !hasRequestSubject) {
        console.log('Template uses Request_Title - use Request_Title');
      } else if (hasRequestSubject && !hasRequestTitle) {
        console.log('Template uses Request_Subject - use Request_Subject');
      } else if (hasRequestTitle && hasRequestSubject) {
        console.log('Template uses both - can use either');
      } else {
        console.log('Template uses neither');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
checkTemplate();
