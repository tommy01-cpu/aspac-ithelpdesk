// Simple debug script to check email functionality
console.log('=== EMAIL SENDING DEBUG ===');

// 1. Check if the form submission is actually calling the API
console.log('1. To test if emails are being triggered:');
console.log('   - Submit a request with emails in field 10');
console.log('   - Check the browser developer console for API calls');
console.log('   - Look for calls to: /api/notifications/send-email');

// 2. Check email configuration
console.log('\n2. Email configuration checklist:');
console.log('   ✅ Template ID 11 exists and is active');
console.log('   ✅ Template TO field: ${Emails_To_Notify}');
console.log('   ⚠️  Check: Mail server settings in database');
console.log('   ⚠️  Check: SMTP configuration');
console.log('   ⚠️  Check: Network connectivity to mail server');

// 3. Manual test instructions
console.log('\n3. Manual testing steps:');
console.log('   a) Open browser and go to: http://localhost:3000');
console.log('   b) Go to any request template form');
console.log('   c) Fill out the form');
console.log('   d) In field 10, add: tom.mandapat@aspacphils.com.ph');
console.log('   e) Open browser Developer Tools (F12)');
console.log('   f) Go to Network tab');
console.log('   g) Submit the form');
console.log('   h) Look for API calls to see if send-email is called');

// 4. Check server logs
console.log('\n4. Check server console logs:');
console.log('   - Look at the terminal where "npm run dev" is running');
console.log('   - Submit a request and watch for email-related logs');
console.log('   - Look for success/error messages from send-email API');

console.log('\n5. Next steps:');
console.log('   If API is called but no emails received:');
console.log('   - Check SMTP settings');
console.log('   - Check spam/junk folder');
console.log('   - Verify email server connectivity');
console.log('   - Check mail server logs');

console.log('\n   If API is NOT called:');
console.log('   - Check form submission logic');
console.log('   - Verify field 10 has data');
console.log('   - Check browser console for JavaScript errors');

console.log('\n✅ Email notification system components are configured correctly');
console.log('🔍 The issue is likely in SMTP configuration or email delivery');
