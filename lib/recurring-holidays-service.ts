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
 * This is the main function that should be called by the background service
 */
export async function checkAndGenerateHolidays(): Promise<{ message: string; results?: any }> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Generate holidays if we're in the last quarter of the year (Oct, Nov, Dec)
    // This ensures next year's holidays are ready in advance
    const shouldGenerate = currentMonth >= 9; // October = 9, November = 10, December = 11
    
    if (shouldGenerate) {
      console.log(`📅 End of year detected (month ${currentMonth + 1}), generating holidays...`);
      const results = await generateRecurringHolidays();
      return { 
        message: `Holiday generation completed for ${currentYear} and ${currentYear + 1}`,
        results 
      };
    } else {
      // Check if current year holidays exist, if not generate them
      const currentYearHolidays = await prisma.holiday.count({
        where: {
          date: {
            gte: new Date(`${currentYear}-01-01`),
            lt: new Date(`${currentYear + 1}-01-01`)
          },
          isRecurring: false // Count only generated holidays, not templates
        }
      });

      if (currentYearHolidays === 0) {
        console.log(`📅 No holidays found for ${currentYear}, generating...`);
        const results = await generateRecurringHolidays();
        return { 
          message: `Generated missing holidays for ${currentYear}`,
          results 
        };
      } else {
        return { message: `Holidays are up to date (${currentYearHolidays} holidays found for ${currentYear})` };
      }
    }
  } catch (error) {
    console.error('❌ Error in checkAndGenerateHolidays:', error);
    return { message: `Error generating holidays: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
