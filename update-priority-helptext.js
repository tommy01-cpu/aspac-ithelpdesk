const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The new help text for priority fields
const NEW_PRIORITY_HELPTEXT = `Select from: 
Low - affects only you as an individual 
Medium - affects the delivery of your services 
High - affects the company's business 
Top - utmost action needed as classified by Management`;

async function updatePriorityHelpText() {
  try {
    console.log('🔍 Starting update of priority field help text...');
    
    // Find all service templates
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        fields: true
      }
    });

    console.log(`📋 Found ${templates.length} service templates to check`);

    let updatedCount = 0;
    let totalPriorityFields = 0;

    for (const template of templates) {
      let fieldsUpdated = false;
      let updatedFields = [];

      // Check if fields is a valid JSON string or array
      let parsedFields;
      try {
        if (typeof template.fields === 'string') {
          parsedFields = JSON.parse(template.fields);
        } else if (Array.isArray(template.fields)) {
          parsedFields = template.fields;
        } else {
          console.log(`⚠️  Template "${template.name}" has invalid fields format, skipping...`);
          continue;
        }
      } catch (error) {
        console.log(`⚠️  Template "${template.name}" has invalid JSON in fields, skipping...`);
        continue;
      }

      // Update priority fields
      if (Array.isArray(parsedFields)) {
        updatedFields = parsedFields.map(field => {
          if (field.type === 'priority') {
            totalPriorityFields++;
            console.log(`   📝 Found priority field: "${field.label}" in template "${template.name}"`);
            
            // Update the help text
            const updatedField = {
              ...field,
              helpText: NEW_PRIORITY_HELPTEXT
            };
            
            fieldsUpdated = true;
            console.log(`   ✅ Updated help text for priority field: "${field.label}"`);
            return updatedField;
          }
          return field;
        });
      }

      // Save the updated template if any priority fields were found
      if (fieldsUpdated) {
        await prisma.template.update({
          where: { id: template.id },
          data: {
            fields: JSON.stringify(updatedFields)
          }
        });
        
        updatedCount++;
        console.log(`✅ Updated template: "${template.name}"`);
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   📋 Total templates checked: ${templates.length}`);
    console.log(`   🎯 Total priority fields found: ${totalPriorityFields}`);
    console.log(`   ✅ Templates updated: ${updatedCount}`);
    console.log('\n✨ Priority field help text update completed successfully!');

    // Show the new help text format
    console.log('\n📝 New help text format applied:');
    console.log('─────────────────────────────────────');
    console.log(NEW_PRIORITY_HELPTEXT);
    console.log('─────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error updating priority help text:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updatePriorityHelpText()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
