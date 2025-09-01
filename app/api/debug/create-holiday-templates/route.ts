import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('🎉 Creating Philippine recurring holiday templates...');
    
    const philippineHolidays = [
      { name: 'New Year\'s Day', month: 0, day: 1, description: 'Start of the new year' },
      { name: 'Araw ng Kagitingan (Day of Valor)', month: 3, day: 9, description: 'Commemoration of the fall of Bataan' },
      { name: 'Labor Day', month: 4, day: 1, description: 'International Workers\' Day' },
      { name: 'Independence Day', month: 5, day: 12, description: 'Philippine Independence Day' },
      { name: 'Ninoy Aquino Day', month: 7, day: 21, description: 'Commemoration of Ninoy Aquino' },
      { name: 'National Heroes Day', month: 7, day: 26, description: 'Last Monday of August - National Heroes Day' },
      { name: 'Bonifacio Day', month: 10, day: 30, description: 'Birth anniversary of Andres Bonifacio' },
      { name: 'Rizal Day', month: 11, day: 30, description: 'Birth anniversary of Jose Rizal' },
      { name: 'Christmas Day', month: 11, day: 25, description: 'Christmas celebration' },
      { name: 'Rizal Day', month: 11, day: 31, description: 'Last day of the year' }
    ];
    
    let added = 0;
    let skipped = 0;
    
    for (const holiday of philippineHolidays) {
      // Use 2024 as the template year
      const templateDate = new Date(2024, holiday.month, holiday.day);
      
      // Check if this recurring holiday template already exists
      const existing = await prisma.holiday.findFirst({
        where: {
          name: holiday.name,
          isRecurring: true
        }
      });
      
      if (!existing) {
        await prisma.holiday.create({
          data: {
            name: holiday.name,
            date: templateDate,
            description: holiday.description,
            isRecurring: true,
            isActive: true
          }
        });
        
        console.log(`✅ Created recurring template: ${holiday.name} (${templateDate.toDateString()})`);
        added++;
      } else {
        console.log(`⏭️  Recurring template already exists: ${holiday.name}`);
        skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Recurring holiday templates created`,
      added,
      skipped,
      total: philippineHolidays.length
    });
    
  } catch (error) {
    console.error('Error creating recurring holiday templates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
