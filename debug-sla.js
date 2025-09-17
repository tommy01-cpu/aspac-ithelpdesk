const { calculateSLADueDate, getOperationalHours } = require('./lib/sla-calculator.ts');

async function debugSLA() {
    console.log('=== SLA DEBUGGING ===');
    
    // Your actual incident data
    const startDate = new Date('2025-09-17T15:33:09'); // Sep 17, 2025, 3:33 PM
    const slaHours = 4;
    
    console.log('Start Date:', startDate.toISOString());
    console.log('Start Date (Local):', startDate.toLocaleString());
    console.log('SLA Hours:', slaHours);
    
    // Check operational hours configuration
    console.log('\n=== OPERATIONAL HOURS CONFIG ===');
    const operationalHours = await getOperationalHours();
    console.log('Operational Hours:', JSON.stringify(operationalHours, null, 2));
    
    // Calculate SLA due date
    console.log('\n=== CALCULATING SLA DUE DATE ===');
    const dueDate = await calculateSLADueDate(startDate, slaHours);
    
    console.log('Calculated Due Date:', dueDate.toISOString());
    console.log('Calculated Due Date (Local):', dueDate.toLocaleString());
    
    // Manual calculation for comparison
    const simpleCalc = new Date(startDate);
    simpleCalc.setHours(simpleCalc.getHours() + slaHours);
    console.log('\n=== SIMPLE CALCULATION (no working hours) ===');
    console.log('Simple Due Date:', simpleCalc.toISOString());
    console.log('Simple Due Date (Local):', simpleCalc.toLocaleString());
    
    // Expected vs actual
    console.log('\n=== COMPARISON ===');
    console.log('Expected (simple): Sep 17, 2025, 7:33 PM');
    console.log('Actual (with working hours):', dueDate.toLocaleString());
    console.log('Your data shows: Sep 18, 2025, 5:32 PM');
}

debugSLA().catch(console.error);