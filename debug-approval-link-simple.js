const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApprovalLinkInTemplate() {
  try {
    console.log('=== DEBUGGING APPROVAL_LINK IN TEMPLATE 13 ===');
    
    // Get template 13 directly
    const template = await prisma.email_templates.findUnique({
      where: { id: 13 }
    });
    
    if (!template) {
      console.log('❌ Template 13 not found');
      return;
    }
    
    console.log('✅ Template found:');
    console.log(`- ID: ${template.id}`);
    console.log(`- Title: ${template.title}`);
    console.log(`- Subject: ${template.subject}`);
    
    // Check template content for approval_link variable
    console.log('\n=== SEARCHING FOR APPROVAL_LINK VARIATIONS ===');
    const content = template.content_html;
    
    const variations = [
      '${approval_link}',
      '${Approval_Link}',
      '${approval_Link}',
      '${Approval_link}'
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
    
    // Test manual variable replacement
    console.log('\n=== TESTING MANUAL VARIABLE REPLACEMENT ===');
    
    const testVariables = {
      'approval_link': 'http://192.168.1.85:3000/requests/approvals/254'
    };
    
    let testContent = content;
    
    console.log('Before replacement:');
    const beforeIndex = testContent.indexOf('${approval_link}');
    if (beforeIndex !== -1) {
      const beforeContext = testContent.substring(beforeIndex - 50, beforeIndex + 100);
      console.log(`   Found at position ${beforeIndex}: ...${beforeContext.replace(/\n/g, '\\n')}...`);
    }
    
    // Manual replacement
    Object.entries(testVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      const beforeCount = (testContent.match(regex) || []).length;
      testContent = testContent.replace(regex, value || '');
      const afterCount = (testContent.match(regex) || []).length;
      
      console.log(`Replaced ${beforeCount - afterCount} occurrence(s) of \${${key}}`);
    });
    
    console.log('\nAfter replacement:');
    const afterIndex = testContent.indexOf('http://192.168.1.85:3000/requests/approvals/254');
    if (afterIndex !== -1) {
      const afterContext = testContent.substring(afterIndex - 50, afterIndex + 100);
      console.log(`   Found replacement at position ${afterIndex}: ...${afterContext.replace(/\n/g, '\\n')}...`);
    }
    
    // Check if any approval_link variables remain
    const remainingCount = (testContent.match(/\$\{approval_link\}/g) || []).length;
    if (remainingCount > 0) {
      console.log(`❌ ${remainingCount} approval_link variable(s) still remain unreplaced!`);
    } else {
      console.log('✅ All approval_link variables successfully replaced');
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

debugApprovalLinkInTemplate();
