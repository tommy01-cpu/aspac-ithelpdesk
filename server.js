const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const logger = require('./lib/logger');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Force load background services in production
if (!dev) {
  console.log('🔧 Production mode: Will initialize background services after server start...');
}

// CORS middleware function - More secure configuration
const enableCors = (req, res) => {
  // More restrictive CORS - only allow your domain and localhost
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:3001',
    'http://192.168.1.85:3000',
    'https://192.168.1.85',
    'http://192.168.1.85',
    'http://43.250.226.166:3000',
    'https://43.250.226.166:3000',
    'http://43.250.226.166:8080',
    'https://ithelpdesk.aspacphils.com.ph',
    'http://ithelpdesk.aspacphils.com.ph',
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-App-Client, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return true;
  }
  return false;
};

// Check if SSL certificates exist
const certPath = path.join(__dirname, './certificates/localhost.crt');
const keyPath = path.join(__dirname, './certificates/localhost.key');
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

app.prepare().then(() => {
  if (hasSSL) {
    // Start HTTPS server if certificates exist
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    
    createHttpsServer(httpsOptions, (req, res) => {
      if (enableCors(req, res)) return;
      
      // Add HTTPS security headers
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(443, '0.0.0.0', (err) => {
      if (err) {
        logger.error('HTTPS Server failed to start:', err);
        throw err;
      }
      logger.security('🔒 [SECURITY] HTTPS Server ready on:');
      logger.info('   - https://localhost');
      logger.info('   - https://192.168.1.85');
      logger.info('   - https://43.250.226.166');
      logger.security('🔒 [SECURITY] All APIs are now ENCRYPTED with SSL/TLS');
      
      // Initialize background services in production
      if (!dev) {
        setTimeout(() => {
          console.log('🔧 Triggering background services initialization...');
          
          // Use Node.js built-in https module instead of fetch
          const https = require('https');
          const options = {
            hostname: 'localhost',
            port: 443,
            path: '/api/init-background-services',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            rejectUnauthorized: false // Ignore self-signed certificate
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                const result = JSON.parse(data);
                console.log('✅ Background services initialization result:', result);
              } catch (error) {
                console.log('✅ Background services initialization completed');
              }
            });
          });

          req.on('error', (error) => {
            console.error('❌ Failed to initialize background services:', error.message);
          });

          req.end();
        }, 5000); // Wait 5 seconds after server start
      }
    });
    
  } else {
    // Start HTTP server on port 3000 that redirects to HTTPS
    createHttpServer((req, res) => {
      // Redirect all HTTP traffic to HTTPS
      const httpsUrl = `https://localhost:3000${req.url}`;
      res.writeHead(301, { 
        Location: httpsUrl,
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      });
      res.end();
    }).listen(3000, (err) => {
      if (err) {
        logger.error('HTTP Redirect Server failed to start:', err);
        throw err;
      }
      logger.server('HTTP Server (port 3000) redirecting to HTTPS');
      logger.warn('SSL certificates not found - install them for direct HTTPS');
    });
  }

  // Mobile app HTTP server (port 3001) - with security warning
  createHttpServer((req, res) => {
    if (enableCors(req, res)) return;
    
    // Add warning header for unencrypted connection
    res.setHeader('X-Security-Warning', 'Unencrypted HTTP connection');
    
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, '0.0.0.0', (err) => {
    if (err) {
      logger.error('Mobile HTTP Server failed to start:', err);
      throw err;
    }
    logger.mobile('📱 [MOBILE] Mobile HTTP Server ready on:');
    logger.info('   - http://localhost:3001');
    logger.info('   - http://192.168.1.85:3001');
    logger.warn('⚠️  [WARNING] Mobile APIs are NOT encrypted (HTTP only)');
  });
});
