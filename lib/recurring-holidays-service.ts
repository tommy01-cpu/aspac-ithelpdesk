import { prisma } from './prisma';

/**
 * FIXED RECURRING HOLIDAYS SERVICE
 * 
 * Key Changes Made:
 * 1. Generated holidays keep the SAME TITLE (no year suffix added)
 * 2. Generated holidays are marked as isRecurring: true (not false)
 * 3. Only adds if holiday doesn't already exist for that year
 * 4. Preserves original description without modification
 * 
 * Example: If you have "New Year's Day" on January 1, 2025 with recurring=true
 * It will create "New Year's Day" on January 1, 2026 (same title, different year)
 */

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
              name: holiday.name, // Keep the same title/name
              date: newHolidayDate,
              description: holiday.description,
              isRecurring: true, // Keep as recurring so it continues to generate
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
 * SIMPLE LOGIC: 
 * - Get all recurring holidays from January 1 to TODAY in current year
 * - For each one that has passed, create next year's version
 * - Example: If today is Sept 1, 2025, process Jan 1, 2025 AND Sept 1, 2025
 */
export async function checkAndGenerateHolidays(): Promise<{ message: string; results?: any }> {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayDate = new Date(currentYear, today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const yearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0); // January 1st of current year
    
    console.log(`📅 Processing holidays from ${yearStart.toDateString()} to ${todayDate.toDateString()}...`);
    
    // Get ALL recurring holidays from January 1 to TODAY (inclusive)
    const recurringHolidays = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
        isActive: true,
        date: {
          gte: yearStart,     // From January 1st of current year
          lte: todayDate      // Until today (inclusive)
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (recurringHolidays.length === 0) {
      console.log('📅 No recurring holidays found from January 1 to today.');
      return { message: 'No recurring holidays found from January 1 to today.' };
    }

    console.log(`📅 Found ${recurringHolidays.length} recurring holidays from Jan 1 to today.`);

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalChecked = 0;

    const nextYear = currentYear + 1;

    // Process EACH holiday that has passed (from Jan 1 to today)
    for (const holiday of recurringHolidays) {
      const holidayDate = new Date(holiday.date);
      const holidayDateOnly = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate(), 0, 0, 0, 0);
      
      totalChecked++;
      console.log(`🔍 Processing: ${holiday.name} - Date: ${holidayDateOnly.toDateString()}`);
      
      // Get the exact month and day from the holiday
      const originalMonth = holidayDate.getMonth(); // 0-indexed (0=Jan, 8=Sep)
      const originalDay = holidayDate.getDate();    // 1-31
      
      // Create next year's version using simple date format without timezone
      const nextYearDateString = `${nextYear}-${String(originalMonth + 1).padStart(2, '0')}-${String(originalDay).padStart(2, '0')}`;
      const nextYearHoliday = new Date(nextYearDateString);
      
      console.log(`📅 ${holiday.name}: ${originalMonth + 1}/${originalDay}/${currentYear} → ${originalMonth + 1}/${originalDay}/${nextYear}`);
      console.log(`📅 Next year date string: ${nextYearDateString}`);
      
      // Check if next year's holiday already exists - use simple date format
      const yearStartString = `${nextYear}-01-01`;
      const yearEndString = `${nextYear + 1}-01-01`;
      
      const existingNextYearHoliday = await prisma.holiday.findFirst({
        where: {
          name: holiday.name,
          date: {
            gte: new Date(yearStartString),
            lt: new Date(yearEndString)
          }
        }
      });

      if (!existingNextYearHoliday) {
        // Create the holiday for next year
        await prisma.holiday.create({
          data: {
            name: holiday.name, // Keep the same title/name
            date: nextYearHoliday,
            description: holiday.description,
            isRecurring: true, // Keep as recurring so it continues to generate
            isActive: true
          }
        });

        console.log(`🎉 CREATED: ${holiday.name} for ${nextYear}: ${nextYearHoliday.toDateString()}`);
        totalAdded++;
      } else {
        console.log(`⏭️  ${holiday.name} for ${nextYear} already exists, skipping.`);
        totalSkipped++;
      }
    }

    const resultMessage = `Holiday generation completed. Checked: ${totalChecked}, Added: ${totalAdded}, Skipped: ${totalSkipped}`;
    console.log(`🎉 ${resultMessage}`);
    
    return { 
      message: resultMessage,
      results: { 
        checked: totalChecked,
        added: totalAdded, 
        skipped: totalSkipped,
        date: todayDate.toDateString(),
        processedRange: `${yearStart.toDateString()} to ${todayDate.toDateString()}`,
        nextYear: nextYear
      } 
    };

  } catch (error) {
    console.error('❌ Error in holiday generation:', error);
    return { message: `Error in holiday generation: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Clean up old generated holidays (optional)
 * Removes holidays older than specified years to keep database clean
 * Now more careful since all holidays are marked as recurring
 */
export async function cleanupOldHolidays(yearsToKeep: number = 2): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToKeep);

    // Find duplicates (same name, different years) and keep only recent ones
    const allHolidays = await prisma.holiday.findMany({
      where: {
        date: {
          lt: cutoffDate
        },
        isActive: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Group by name and keep only the most recent for each name
    const holidayGroups = new Map<string, any[]>();
    
    for (const holiday of allHolidays) {
      if (!holidayGroups.has(holiday.name)) {
        holidayGroups.set(holiday.name, []);
      }
      holidayGroups.get(holiday.name)!.push(holiday);
    }

    const idsToDelete: number[] = [];
    
    for (const [name, holidays] of Array.from(holidayGroups.entries())) {
      // Sort by date descending and keep only the most recent yearsToKeep
      holidays.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
      
      // Mark older ones for deletion
      if (holidays.length > yearsToKeep) {
        const toDelete = holidays.slice(yearsToKeep);
        idsToDelete.push(...toDelete.map((h: any) => h.id));
      }
    }

    if (idsToDelete.length > 0) {
      const result = await prisma.holiday.deleteMany({
        where: {
          id: {
            in: idsToDelete
          }
        }
      });

      console.log(`🧹 Cleaned up ${result.count} old holiday entries.`);
    } else {
      console.log(`🧹 No old holidays to clean up.`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old holidays:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate the fixed recurring behavior
 * Example usage to verify the fix works correctly
 */
export async function testRecurringHolidays(): Promise<void> {
  console.log('🧪 Testing recurring holidays functionality...');
  
  try {
    // Get all holidays with the same name to show the recurring pattern
    const allHolidays = await prisma.holiday.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { name: 'asc' },
        { date: 'asc' }
      ]
    });

    // Group by name to show recurring pattern
    const groupedByName = allHolidays.reduce((acc: any, holiday: any) => {
      if (!acc[holiday.name]) {
        acc[holiday.name] = [];
      }
      acc[holiday.name].push({
        date: holiday.date.toDateString(),
        year: holiday.date.getFullYear(),
        isRecurring: holiday.isRecurring,
        description: holiday.description
      });
      return acc;
    }, {});

    console.log('📅 Current holidays grouped by name:');
    Object.entries(groupedByName).forEach(([name, holidays]: [string, any]) => {
      console.log(`\n🎉 ${name}:`);
      holidays.forEach((h: any, index: number) => {
        console.log(`   ${index + 1}. ${h.date} (${h.year}) - Recurring: ${h.isRecurring}`);
      });
    });

    console.log('\n✅ Test completed. Check the output above to verify recurring holidays have the same titles but different years.');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}
