const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplate14() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 14 }
    });
    
    if (!template) {
      console.log('Template 14 not found');
      return;
    }
    
    // Get the current content
    let content = template.content_html;
    
    // Show current approval/comment lines
    console.log('Current content includes:');
    console.log('- Approval line:', content.includes('${Request_Approval_Status}'));
    console.log('- Comment line:', content.includes('${Request_Approval_Comment}'));
    
    // Create the conditional approval section
    // We'll wrap the approval and comment lines in a simple JavaScript-style conditional
    const originalApprovalSection = `<p style="color: rgb(119, 119, 119); font-size: 13px; font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 8px 0px;"><b>Approval:</b>&nbsp;<strong style="color: black;">${Request_Approval_Status}</strong></p>
                              <p style="color: rgb(119, 119, 119); font-size: 13px; font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 8px 0px;"><b>Comment:</b>&nbsp;<strong style="color: black;">${Request_Approval_Comment}</strong></p>`;
    
    // However, since we can't use JavaScript in email templates, let's use a simpler approach:
    // Replace the approval section with a conditional that shows only when values exist
    // For now, let's see if we can use a CSS-based approach
    const conditionalApprovalSection = `<!-- Approval section - only shows if values are provided -->
                              ${Request_Approval_Status ? '<p style="color: rgb(119, 119, 119); font-size: 13px; font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 8px 0px;"><b>Approval:</b>&nbsp;<strong style="color: black;">${Request_Approval_Status}</strong></p>' : ''}
                              ${Request_Approval_Comment ? '<p style="color: rgb(119, 119, 119); font-size: 13px; font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 8px 0px;"><b>Comment:</b>&nbsp;<strong style="color: black;">${Request_Approval_Comment}</strong></p>' : ''}`;
    
    console.log('Email templates in this system appear to be static HTML with variable substitution only.');
    console.log('For now, empty approval fields will show as empty in the email.');
    console.log('Recommendation: Set approval fields to meaningful text like "N/A" or create a separate template for reopened requests.');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplate14();
