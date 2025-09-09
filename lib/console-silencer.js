/**
 * Console silencer utility
 * Completely disables console output in production UNLESS explicitly enabled
 * Import this at the top of any file to silence console.log globally
 */

const shouldSilence = (process.env.NODE_ENV === 'production' && process.env.ENABLE_CONSOLE_LOGS !== 'true') || 
                     process.env.ENABLE_CONSOLE_LOGS === 'false';

if (shouldSilence) {
  // Store original functions
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTrace = console.trace;

  // Override console methods but allow initialization messages through
  console.log = (...args) => {
    const message = args.join(' ');
    // Always allow initialization and critical startup messages
    if (message.includes('🔧 First-time background service initialization') ||
        message.includes('✅ Background services initialized') ||
        message.includes('🚀 PRODUCTION MODE: Initializing') ||
        message.includes('🔧 DEVELOPMENT MODE: Initializing') ||
        message.includes('📧 [') || // Approval reminder logs
        message.includes('⏰ [') || // SLA monitoring logs
        message.includes('🎉 [') || // Holiday logs
        message.includes('🔄 [') || // Auto-close logs
        message.includes('🔒 [SECURITY]') ||
        message.includes('📱 [MOBILE]') ||
        message.includes('✅ [SUCCESS]') ||
        message.includes('❌ [ERROR]') ||
        message.includes('⚠️  [WARNING]')) {
      originalLog(...args);
    }
    // Silently ignore all other console.log calls
  };
  
  console.info = (...args) => {
    const message = args.join(' ');
    // Allow info messages for server startup and initialization
    if (message.includes('Server ready') ||
        message.includes('HTTPS') ||
        message.includes('initialized') ||
        message.includes('service') ||
        message.includes('ready on')) {
      originalInfo(...args);
    }
  };
  
  console.debug = (...args) => {
    // Allow debug logs if explicitly enabled
    if (process.env.ENABLE_DEBUG_LOGS === 'true') {
      originalDebug(...args);
    }
    // Otherwise silently ignore
  };
  console.trace = () => {}; // Always silence trace

  // Keep warnings and errors for debugging
  // console.warn and console.error remain active

  // If you want to restore logging for testing, export the restore function
  if (typeof global !== 'undefined') {
    global.restoreConsole = () => {
      console.log = originalLog;
      console.info = originalInfo;
      console.debug = originalDebug;
      console.trace = originalTrace;
    };
  }
}

module.exports = {
  silence: () => {
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
      console.trace = () => {};
    }
  },
  
  restore: () => {
    if (global.restoreConsole) {
      global.restoreConsole();
    }
  }
};
