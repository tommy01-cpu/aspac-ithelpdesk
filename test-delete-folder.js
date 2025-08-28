// Test script to check folder deletion
const fetch = require('node-fetch');

const testDeleteFolder = async () => {
  const folderId = '1'; // Test with folder ID 1
  const userId = '1'; // Test with user ID 1
  
  try {
    console.log(`Testing deletion of folder ${folderId} by user ${userId}`);
    
    const response = await fetch(`http://localhost:3000/api/technician/report-folders?id=${folderId}&userId=${userId}`, {
      method: 'DELETE'
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (!response.ok) {
      console.error('Delete failed with status:', response.status);
    } else {
      console.log('Delete succeeded');
    }
  } catch (error) {
    console.error('Error testing delete:', error);
  }
};

testDeleteFolder();
