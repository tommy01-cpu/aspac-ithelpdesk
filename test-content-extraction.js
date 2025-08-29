// Simple test to check if our fix works
console.log('Testing email template processing...');

// Simulate the content extraction logic we fixed
function testContentExtraction(content_html) {
  console.log('=== TESTING CONTENT EXTRACTION ===');
  console.log('Original content starts with table:', content_html.trim().startsWith('<table'));
  
  let content = content_html;
  
  // Pattern 1: div with padding style
  const contentMatch = content.match(/<div[^>]*style="[^"]*padding:\s*32px[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (contentMatch) {
    content = contentMatch[1];
    console.log('Used div wrapper extraction pattern 1');
  } else {
    // Pattern 2: div with class and padding
    const altMatch = content.match(/<div[^>]*class="[^"]*"[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (altMatch) {
      content = altMatch[1];
      console.log('Used div wrapper extraction pattern 2');
    } else {
      // Pattern 3: Check if content starts with table (like CC template)
      if (content.trim().startsWith('<table')) {
        // For table-based templates, use the content as-is
        console.log('Template is table-based, using content as-is');
        // content remains unchanged
      } else {
        console.log('No wrapper pattern matched, using content as-is');
        // content remains unchanged for other templates
      }
    }
  }
  
  console.log('Final content preserved:', content.length > 0 && content.includes('<table'));
  console.log('Content length:', content.length);
  return content;
}

// Test with CC template content
const ccTemplateContent = `<table style="background: rgb(58, 93, 115); margin: 0; padding-top: 40px; padding-bottom: 40px;" align="center" width="100%">
  <tbody>
    <tr>
      <td align="center">
        <div style="max-width: 600px; background-color: rgb(238, 242, 243);">
          <table cellpadding="0" cellspacing="0" border="0" width="600" align="center">
            <tbody>
              <tr>
                <td>Test content with variables: \${Request_ID}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  </tbody>
</table>`;

// Test with regular template content (div-based)
const regularTemplateContent = `<div style="padding: 32px; background: white;">
  <h1>Regular Template</h1>
  <p>Content with variables: \${Request_ID}</p>
</div>`;

console.log('\n=== CC Template Test ===');
testContentExtraction(ccTemplateContent);

console.log('\n=== Regular Template Test ===');
testContentExtraction(regularTemplateContent);

console.log('\n=== Test Complete ===');
