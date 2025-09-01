import { prisma } from './prisma';

/**
 * Automated service to generate recurring holidays
 * Works with existing holiday structure (no schema changes needed)
 */
export async function generateRecurringHolidays(): Promise<{ added: number; skipped: number }> {
  try {
    console.log('🎉 Starting recurring holiday generation service...');
    
    // Get all recurring holidays (using existing isRecurring field)
    const recurringHolidays = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
        isActive: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (recurringHolidays.length === 0) {
      console.log('📅 No recurring holidays found.');
      return { added: 0, skipped: 0 };
    }

    console.log(`📅 Found ${recurringHolidays.length} recurring holidays to process.`);

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const yearsToGenerate = [currentYear, nextYear, nextYear + 1]; // Generate for current year + 2 years ahead

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const holiday of recurringHolidays) {
      console.log(`🔄 Processing recurring holiday: ${holiday.name}`);
      
      for (const year of yearsToGenerate) {
        // Create the holiday date for this year
        const originalDate = new Date(holiday.date);
        const newHolidayDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
        
        // Check if this holiday already exists for this year
        const existingHoliday = await prisma.holiday.findFirst({
          where: {
            name: holiday.name,
            date: {
              gte: new Date(year, 0, 1), // January 1st of the year
              lt: new Date(year + 1, 0, 1) // January 1st of next year
            }
          }
        });

        if (!existingHoliday) {
          // Create the recurring holiday for this year
          await prisma.holiday.create({
            data: {
              name: holiday.name,
              date: newHolidayDate,
              description: holiday.description ? `${holiday.description} (${year})` : `Recurring holiday for ${year}`,
              isRecurring: false, // Mark generated holidays as non-recurring to avoid infinite loops
              isActive: true
            }
          });

          console.log(`✅ Created ${holiday.name} for ${year}: ${newHolidayDate.toDateString()}`);
          totalAdded++;
        } else {
          console.log(`⏭️  ${holiday.name} already exists for ${year}, skipping.`);
          totalSkipped++;
        }
      }
    }

    console.log(`🎉 Recurring holiday generation completed. Added: ${totalAdded}, Skipped: ${totalSkipped}`);
    return { added: totalAdded, skipped: totalSkipped };

  } catch (error) {
    console.error('❌ Error generating recurring holidays:', error);
    throw error;
  }
}

/**
 * Check if holidays need to be generated and generate them
 * This is the main function that should be called by the background service DAILY
 * 
 * NEW LOGIC: Daily check for passed holidays and auto-generate next year
 */
export async function checkAndGenerateHolidays(): Promise<{ message: string; results?: any }> {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`📅 Daily holiday check for ${currentDate.toDateString()}...`);
    
    // Step 1: Get all recurring holiday templates
    const recurringTemplates = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
        isActive: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (recurringTemplates.length === 0) {
      console.log('📅 No recurring holiday templates found.');
      return { message: 'No recurring holiday templates found. Please create recurring holiday templates first.' };
    }

    console.log(`📅 Found ${recurringTemplates.length} recurring holiday templates to check.`);

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalChecked = 0;

    // Step 2: For each recurring template, check if this year's holiday has passed
    for (const template of recurringTemplates) {
      const originalDate = new Date(template.date);
      
      // Create this year's version of the holiday
      const thisYearHoliday = new Date(currentYear, originalDate.getMonth(), originalDate.getDate());
      
      totalChecked++;
      console.log(`🔍 Checking: ${template.name} - This year's date: ${thisYearHoliday.toDateString()}`);
      
      // Check if this year's holiday has passed or is today
      if (thisYearHoliday <= currentDate) {
        console.log(`✅ ${template.name} has passed this year (${thisYearHoliday.toDateString()}), checking next year...`);
        
        // Generate for next year
        const nextYear = currentYear + 1;
        const nextYearHoliday = new Date(nextYear, originalDate.getMonth(), originalDate.getDate());
        
        // Check if next year's holiday already exists
        const existingNextYearHoliday = await prisma.holiday.findFirst({
          where: {
            name: template.name,
            date: {
              gte: new Date(nextYear, 0, 1), // January 1st of next year
              lt: new Date(nextYear + 1, 0, 1) // January 1st of year after next
            }
          }
        });

        if (!existingNextYearHoliday) {
          // Create the holiday for next year
          await prisma.holiday.create({
            data: {
              name: template.name,
              date: nextYearHoliday,
              description: template.description ? `${template.description} (${nextYear})` : `Recurring holiday for ${nextYear}`,
              isRecurring: false, // Mark generated holidays as non-recurring
              isActive: true
            }
          });

          console.log(`🎉 AUTO-CREATED: ${template.name} for ${nextYear}: ${nextYearHoliday.toDateString()}`);
          totalAdded++;
        } else {
          console.log(`⏭️  ${template.name} for ${nextYear} already exists, skipping.`);
          totalSkipped++;
        }
      } else {
        console.log(`⏳ ${template.name} hasn't passed yet this year (${thisYearHoliday.toDateString()}), no action needed.`);
        totalSkipped++;
      }
    }

    // Step 3: Also ensure current year holidays exist (in case system is new)
    console.log(`📅 Ensuring current year (${currentYear}) holidays exist...`);
    
    for (const template of recurringTemplates) {
      const originalDate = new Date(template.date);
      const currentYearHoliday = new Date(currentYear, originalDate.getMonth(), originalDate.getDate());
      
      const existingCurrentYearHoliday = await prisma.holiday.findFirst({
        where: {
          name: template.name,
          date: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1)
          }
        }
      });

      if (!existingCurrentYearHoliday) {
        await prisma.holiday.create({
          data: {
            name: template.name,
            date: currentYearHoliday,
            description: template.description ? `${template.description} (${currentYear})` : `Recurring holiday for ${currentYear}`,
            isRecurring: false,
            isActive: true
          }
        });

        console.log(`🎉 BACKFILLED: ${template.name} for ${currentYear}: ${currentYearHoliday.toDateString()}`);
        totalAdded++;
      }
    }

    const resultMessage = `Daily holiday check completed. Checked: ${totalChecked}, Added: ${totalAdded}, Skipped: ${totalSkipped}`;
    console.log(`🎉 ${resultMessage}`);
    
    return { 
      message: resultMessage,
      results: { 
        checked: totalChecked,
        added: totalAdded, 
        skipped: totalSkipped,
        date: currentDate.toDateString(),
        templatesFound: recurringTemplates.length
      } 
    };

  } catch (error) {
    console.error('❌ Error in daily holiday check:', error);
    return { message: `Error in daily holiday check: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Clean up old generated holidays (optional)
 * Removes holidays older than specified years to keep database clean
 */
export async function cleanupOldHolidays(yearsToKeep: number = 2): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToKeep);

    const result = await prisma.holiday.deleteMany({
      where: {
        date: {
          lt: cutoffDate
        },
        isRecurring: false // Only delete generated holidays, keep original recurring ones
      }
    });

    console.log(`🧹 Cleaned up ${result.count} old holiday entries.`);
  } catch (error) {
    console.error('❌ Error cleaning up old holidays:', error);
    throw error;
  }
}
