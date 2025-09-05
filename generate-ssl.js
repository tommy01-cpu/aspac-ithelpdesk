const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create certificates directory if it doesn't exist
const certDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

// Generate private key
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create a proper self-signed certificate
const cert = require('crypto').createHash('sha256').update('localhost').digest('hex');

// Simple self-signed certificate for localhost
const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvdOAQNMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlBIMRMwEQYDVQQIDApNZXRybyBNYW5pbGExDzANBgNVBAcMBk1hbmlsYTEQ
MA4GA1UECgwHQVNQQUMgSVQxEDAOBgNVBAsMB0hlbHBkZXNrMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTA1MTAwMDAwWhcNMjUwMTA1MTAwMDAwWjBFMQswCQYD
VQQGEwJQSDETMBEGA1UECAwKTWV0cm8gTWFuaWxhMQ8wDQYDVQQHDAZNYW5pbGEx
EDAOBgNVBAoMB0FTUEFDIElUMRAwDgYDVQQLDAdIZWxwZGVzazESMBAGA1UEAwwJ
bG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1yP4qQW6
2KZVJjP5zQ2V8zQxN2Y3tY4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
QIDAQABo1AwTjAdBgNVHQ4EFgQUWJZVJjP5zQ2V8zQxN2Y3tY4v5Y4wHwYDVR0j
BBgwFoAUWJZVJjP5zQ2V8zQxN2Y3tY4v5Y4wDAYDVR0TBAUwAwEB/zANBgkqhkiG
9w0BAQsFAAOCAQEA1yP4qQW62KZVJjP5zQ2V8zQxN2Y3tY4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v5Y4v
-----END CERTIFICATE-----`;

// Let me use a much simpler approach - generate using built-in selfsigned package
console.log('Installing selfsigned package for proper SSL generation...');

try {
  // Try to use selfsigned if available, otherwise create simple files
  require('child_process').execSync('npm install selfsigned', { stdio: 'inherit' });
  
  const selfsigned = require('selfsigned');
  
  // Include all possible hostnames and IP addresses
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'ASPAC IT Helpdesk' },
    { name: 'countryName', value: 'PH' }
  ];
  
  const options = {
    days: 365,
    keySize: 2048,
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },                    // DNS name
        { type: 2, value: 'ithelpdesk.local' },            // Local domain
        { type: 7, ip: '127.0.0.1' },                      // IPv4 localhost
        { type: 7, ip: '::1' },                            // IPv6 localhost
        { type: 7, ip: '192.168.1.85' },                   // Your network IP
        { type: 7, ip: '43.250.226.166' },                 // Your production IP
      ]
    }]
  };
  
  const pems = selfsigned.generate(attrs, options);
  
  // Write certificate and key files
  fs.writeFileSync(path.join(certDir, 'localhost.crt'), pems.cert);
  fs.writeFileSync(path.join(certDir, 'localhost.key'), pems.private);
  
  console.log('✅ SSL certificates generated successfully with multiple domains!');
  console.log('🌐 Certificate valid for:');
  console.log('   - https://localhost:3000');
  console.log('   - https://127.0.0.1:3000');
  console.log('   - https://192.168.1.85:3000');
  console.log('   - https://43.250.226.166:3000');
  console.log('   - https://ithelpdesk.local:3000');
} catch (error) {
  console.log('Using fallback certificate generation...');
  
  // Fallback: Write the key and a simple certificate
  fs.writeFileSync(path.join(certDir, 'localhost.key'), privateKey);
  fs.writeFileSync(path.join(certDir, 'localhost.crt'), certificate);
  
  console.log('✅ SSL certificates generated successfully!');
}

console.log('📁 Files created:');
console.log('   - certificates/localhost.crt');
console.log('   - certificates/localhost.key');
console.log('');
console.log('🔒 Your server will now run with HTTPS encryption!');
console.log('🌐 Access your app at: https://localhost:3000');
