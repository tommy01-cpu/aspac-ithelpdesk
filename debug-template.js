const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 15 },
      select: { subject: true, content_html: true }
    });
    
    if (template) {
      console.log('SUBJECT:', template.subject);
      console.log('\nCONTENT (first 1000 chars):');
      console.log(template.content_html.substring(0, 1000));
      
      console.log('\nLooking for Request_Title vs Request_Subject:');
      const hasTitle = template.content_html.includes('Request_Title');
      const hasSubject = template.content_html.includes('Request_Subject');
      console.log('Has Request_Title:', hasTitle);
      console.log('Has Request_Subject:', hasSubject);
      
      if (hasTitle) {
        console.log('\nTemplate uses Request_Title - need to change code to use Request_Title');
      } else if (hasSubject) {
        console.log('\nTemplate uses Request_Subject - code is correct');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
checkTemplate();
