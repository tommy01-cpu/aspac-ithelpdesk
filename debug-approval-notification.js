const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApprovalNotificationTemplate() {
  try {
    console.log('=== DEBUGGING NOTIFY-APPROVER-APPROVAL TEMPLATE (ID 12) ===');
    
    // Get template 12 (notify-approver-approval)
    const template = await prisma.email_templates.findUnique({
      where: { id: 12 }
    });
    
    if (!template) {
      console.log('❌ Template 12 not found');
      return;
    }
    
    console.log('✅ Template found:');
    console.log(`- ID: ${template.id}`);
    console.log(`- Template Key: ${template.template_key}`);
    console.log(`- Title: ${template.title}`);
    console.log(`- Subject: ${template.subject}`);
    
    // Check template content for approval_link variable
    console.log('\n=== SEARCHING FOR APPROVAL_LINK VARIATIONS ===');
    const content = template.content_html;
    
    const variations = [
      '${approval_link}',
      '${Approval_Link}',
      '${approval_Link}',
      '${Approval_link}',
      '${Encoded_Approval_URL}',
      '${Request_Link}'
    ];
    
    console.log('Template content length:', content.length);
    
    variations.forEach(variation => {
      const count = (content.match(new RegExp(escapeRegex(variation), 'g')) || []).length;
      if (count > 0) {
        console.log(`✅ Found ${count} occurrence(s) of: ${variation}`);
        
        // Find all positions
        let index = content.indexOf(variation);
        let occurrence = 1;
        while (index !== -1) {
          const contextStart = Math.max(0, index - 80);
          const contextEnd = Math.min(content.length, index + variation.length + 80);
          const context = content.substring(contextStart, contextEnd);
          
          console.log(`   Occurrence ${occurrence} at position ${index}:`);
          console.log(`   Context: ...${context.replace(/\n/g, '\\n')}...`);
          
          index = content.indexOf(variation, index + 1);
          occurrence++;
        }
      } else {
        console.log(`❌ Not found: ${variation}`);
      }
    });
    
    // Check what variables are being sent in the approval notification
    console.log('\n=== CHECKING VARIABLES SENT FROM API ===');
    console.log('From the logs, the approval notification should receive these variables:');
    console.log('- Request_ID');
    console.log('- Request_Status'); 
    console.log('- Request_Subject');
    console.log('- Request_Description');
    console.log('- Requester_Name');
    console.log('- Requester_Email');
    console.log('- Approver_Name');
    console.log('- Approver_Email');
    console.log('- Base_URL');
    console.log('- Encoded_Approval_URL');
    console.log('- Request_Link');
    
    // Test manual variable replacement with the variables that should be sent
    console.log('\n=== TESTING MANUAL VARIABLE REPLACEMENT ===');
    
    const testVariables = {
      'Request_ID': '254',
      'Request_Status': 'for_approval',
      'Request_Subject': 'test2 (Copy)',
      'Request_Description': '<p>test</p>',
      'Requester_Name': 'Jose Tommy Mandapat',
      'Requester_Email': 'tom.mandapat@aspacphils.com.ph',
      'Approver_Name': 'Jose Tommy Mandapat',
      'Approver_Email': 'tom.mandapat@aspacphils.com.ph',
      'Base_URL': 'http://192.168.1.85:3000',
      'Encoded_Approval_URL': 'http%3A%2F%2F192.168.1.85%3A3000%2Frequests%2Fapprovals%2F254',
      'Request_Link': 'http://192.168.1.85:3000/login?callbackUrl=%2Frequests%2Fview%2F254'
    };
    
    let testContent = content;
    let testSubject = template.subject;
    
    console.log('Variables to test:', Object.keys(testVariables));
    
    // Manual replacement
    Object.entries(testVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      const beforeCount = (testContent.match(regex) || []).length;
      testContent = testContent.replace(regex, value || '');
      testSubject = testSubject.replace(regex, value || '');
      const afterCount = (testContent.match(regex) || []).length;
      
      if (beforeCount > 0) {
        console.log(`✅ Replaced ${beforeCount - afterCount} occurrence(s) of \${${key}}`);
      }
    });
    
    console.log('\nAfter replacement:');
    console.log(`Subject: ${testSubject}`);
    
    // Check for any unreplaced variables
    const unreplacedVariables = testContent.match(/\$\{[^}]+\}/g) || [];
    if (unreplacedVariables.length > 0) {
      console.log(`❌ ${unreplacedVariables.length} unreplaced variable(s) found:`);
      unreplacedVariables.forEach(variable => {
        console.log(`   - ${variable}`);
        
        // Show context
        const index = testContent.indexOf(variable);
        if (index !== -1) {
          const contextStart = Math.max(0, index - 50);
          const contextEnd = Math.min(testContent.length, index + variable.length + 50);
          const context = testContent.substring(contextStart, contextEnd);
          console.log(`     Context: ...${context.replace(/\n/g, '\\n')}...`);
        }
      });
    } else {
      console.log('✅ All variables successfully replaced');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

debugApprovalNotificationTemplate();
