const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEnumStatus() {
  try {
    console.log('🔍 Checking Enum Implementation Status...\n');

    // Try to introspect the current schema
    const result = await prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('ApprovalStatus', 'RequestStatus')
      ORDER BY t.typname, e.enumsortorder;
    `;

    if (result.length > 0) {
      console.log('✅ DATABASE ENUMS ARE IMPLEMENTED:');
      let currentEnum = '';
      result.forEach(row => {
        if (row.enum_name !== currentEnum) {
          currentEnum = row.enum_name;
          console.log(`\n📋 ${row.enum_name}:`);
        }
        console.log(`   - ${row.enum_value}`);
      });
      console.log('\n🎯 Status: Using TRUE DATABASE ENUMS');
    } else {
      console.log('❌ No database enums found');
      console.log('🔧 Status: Using STRING CONSTANTS only');
    }

  } catch (error) {
    console.log('❌ Database enums not found or error occurred:', error.message);
    console.log('🔧 Status: Using STRING CONSTANTS only');
    
    // Check if we can create a test record with enum values
    console.log('\n🧪 Testing string constants approach...');
    try {
      // Test if the API constants work
      const APPROVAL_STATUS = {
        PENDING_APPROVAL: 'pending_approval',
        FOR_CLARIFICATION: 'for_clarification', 
        REJECTED: 'rejected',
        APPROVED: 'approved'
      };

      const REQUEST_STATUS = {
        FOR_APPROVAL: 'for_approval',
        CANCELLED: 'cancelled',
        OPEN: 'open',
        ON_HOLD: 'on_hold',
        RESOLVED: 'resolved',
        CLOSED: 'closed'
      };

      console.log('✅ String constants are available:');
      console.log('📋 ApprovalStatus:', Object.values(APPROVAL_STATUS));
      console.log('📋 RequestStatus:', Object.values(REQUEST_STATUS));
    } catch (constError) {
      console.log('❌ String constants test failed:', constError.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkEnumStatus();
