const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateStatusValues() {
  try {
    console.log('🔧 Starting template status value fix...');
    
    // Status mapping from display names to database enum values
    const statusMap = {
      'For Approval': 'for_approval',
      'Cancelled': 'cancelled', 
      'Open': 'open',
      'On-Hold': 'on_hold',
      'Resolved': 'resolved',
      'Closed': 'closed'
    };
    
    // Get all templates
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        fields: true
      }
    });
    
    console.log(`📋 Found ${templates.length} templates to check`);
    
    let updatedCount = 0;
    
    for (const template of templates) {
      try {
        const fields = typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields;
        let fieldsUpdated = false;
        
        // Find and update status fields
        const updatedFields = fields.map(field => {
          if (field.type === 'status' && field.options) {
            // Check if options contain display names that need to be converted
            const needsUpdate = field.options.some(option => statusMap[option]);
            
            if (needsUpdate) {
              console.log(`  📝 Updating template ${template.id} (${template.name})`);
              console.log(`     Old options: ${JSON.stringify(field.options)}`);
              
              // Convert display names to enum values
              const updatedOptions = field.options.map(option => statusMap[option] || option);
              
              console.log(`     New options: ${JSON.stringify(updatedOptions)}`);
              fieldsUpdated = true;
              
              return {
                ...field,
                options: updatedOptions
              };
            }
          }
          return field;
        });
        
        if (fieldsUpdated) {
          // Update the template in database
          await prisma.template.update({
            where: { id: template.id },
            data: { 
              fields: JSON.stringify(updatedFields)
            }
          });
          
          updatedCount++;
          console.log(`  ✅ Updated template ${template.id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing template ${template.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Template fix completed!`);
    console.log(`   Templates checked: ${templates.length}`);
    console.log(`   Templates updated: ${updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error during template fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateStatusValues();
