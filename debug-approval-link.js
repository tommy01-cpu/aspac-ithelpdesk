const { PrismaClient } = require('@prisma/client');
const { sendEmailWithTemplateId, getTemplateIdByType, convertDatabaseTemplateToEmail, getEmailTemplateById } = require('./lib/database-email-templates.ts');

const prisma = new PrismaClient();

async function debugApprovalLinkVariable() {
  try {
    console.log('=== DEBUGGING APPROVAL_LINK VARIABLE ===');
    
    // 1. Check the template ID mapping
    console.log('1. Checking template ID for APPROVAL_REMINDER...');
    const templateId = getTemplateIdByType('APPROVAL_REMINDER');
    console.log(`Template ID: ${templateId}`);
    
    if (!templateId) {
      console.log('❌ Template ID not found for APPROVAL_REMINDER');
      return;
    }
    
    // 2. Get the actual template from database
    console.log('\n2. Getting template from database...');
    const template = await getEmailTemplateById(templateId);
    
    if (!template) {
      console.log('❌ Template not found in database');
      return;
    }
    
    console.log('✅ Template found:');
    console.log(`- ID: ${template.id}`);
    console.log(`- Title: ${template.title}`);
    console.log(`- Subject: ${template.subject}`);
    
    // 3. Check template content for approval_link variable
    console.log('\n3. Searching for approval_link in template content...');
    const content = template.content_html;
    
    // Look for different variations
    const variations = [
      '${approval_link}',
      '${Approval_Link}',
      '${approval_Link}',
      '${Approval_link}'
    ];
    
    variations.forEach(variation => {
      if (content.includes(variation)) {
        console.log(`✅ Found: ${variation}`);
        
        // Find context around this variable
        const index = content.indexOf(variation);
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(content.length, index + variation.length + 50);
        const context = content.substring(contextStart, contextEnd);
        console.log(`   Context: ...${context}...`);
      } else {
        console.log(`❌ Not found: ${variation}`);
      }
    });
    
    // 4. Test variable replacement with sample data
    console.log('\n4. Testing variable replacement...');
    const testVariables = {
      'Approver_Name': 'Jose Tommy Mandapat',
      'Approver_Email': 'tom.mandapat@aspacphils.com.ph',
      'Pending_Requests_Count': '1',
      'Pending_Requests_List': '- Request #254: "Install LOGiX+ Client App" from Jose Tommy Mandapat',
      'Base_URL': 'http://192.168.1.85:3000',
      'approval_link': 'http://192.168.1.85:3000/requests/approvals/254',
      'request_link': 'http://192.168.1.85:3000/requests/view/254',
      'Encoded_Approvals_URL': 'http%3A%2F%2F192.168.1.85%3A3000%2Frequests%2Fapprovals%2F254'
    };
    
    console.log('Test variables:', JSON.stringify(testVariables, null, 2));
    
    // 5. Convert template
    console.log('\n5. Converting template...');
    const result = convertDatabaseTemplateToEmail(template, testVariables);
    
    console.log('Subject after conversion:', result.subject);
    
    // 6. Check if approval_link was replaced in content
    console.log('\n6. Checking if approval_link was replaced...');
    if (result.htmlContent.includes('${approval_link}')) {
      console.log('❌ approval_link variable was NOT replaced!');
      
      // Find the unreplaced variable
      const unreplacedIndex = result.htmlContent.indexOf('${approval_link}');
      const contextStart = Math.max(0, unreplacedIndex - 100);
      const contextEnd = Math.min(result.htmlContent.length, unreplacedIndex + 100);
      const context = result.htmlContent.substring(contextStart, contextEnd);
      console.log('Context with unreplaced variable:', context);
    } else {
      console.log('✅ approval_link variable was replaced successfully!');
      
      // Show where it was replaced
      const urlIndex = result.htmlContent.indexOf('http://192.168.1.85:3000/requests/approvals/254');
      if (urlIndex !== -1) {
        const contextStart = Math.max(0, urlIndex - 50);
        const contextEnd = Math.min(result.htmlContent.length, urlIndex + 100);
        const context = result.htmlContent.substring(contextStart, contextEnd);
        console.log('Replaced content context:', context);
      }
    }
    
    // 7. Test sendEmailWithTemplateId function
    console.log('\n7. Testing sendEmailWithTemplateId function...');
    const emailContent = await sendEmailWithTemplateId(templateId, testVariables);
    
    if (emailContent) {
      console.log('✅ sendEmailWithTemplateId succeeded');
      console.log('Email subject:', emailContent.subject);
      
      if (emailContent.htmlContent.includes('${approval_link}')) {
        console.log('❌ approval_link still not replaced in final email content!');
      } else {
        console.log('✅ approval_link properly replaced in final email content');
      }
    } else {
      console.log('❌ sendEmailWithTemplateId failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovalLinkVariable();
