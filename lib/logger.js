/**
 * Production-ready logging utility
 * Hides console.log in production mode while maintaining development visibility
 */

const isProduction = process.env.NODE_ENV === 'production';
const enableConsoleLogs = process.env.ENABLE_CONSOLE_LOGS === 'true';
const enableDebugLogs = process.env.ENABLE_DEBUG_LOGS === 'true';
const logLevel = process.env.LOG_LEVEL || 'normal'; // minimal, normal, verbose

const logger = {
  // Development logging - hidden in production unless explicitly enabled
  dev: (...args) => {
    if (!isProduction || enableConsoleLogs) {
      console.log('🔧 [DEV]', ...args);
    }
  },

  // Information logging - controlled by log level
  info: (...args) => {
    if (!isProduction || logLevel === 'verbose') {
      console.log('ℹ️  [INFO]', ...args);
    } else if (isProduction && logLevel === 'minimal') {
      // Only log critical info in minimal production mode
      if (args[0] && (args[0].includes('ready on') || args[0].includes('Server') || args[0].includes('HTTPS'))) {
        console.log('✅', ...args);
      }
    }
  },

  // Success logging - always show
  success: (...args) => {
    console.log('✅ [SUCCESS]', ...args);
  },

  // Warning logging - always show
  warn: (...args) => {
    console.warn('⚠️  [WARNING]', ...args);
  },

  // Error logging - always show
  error: (...args) => {
    console.error('❌ [ERROR]', ...args);
  },

  // Security logging - always show
  security: (...args) => {
    console.log('🔒 [SECURITY]', ...args);
  },

  // Server status - controlled by log level
  server: (...args) => {
    if (!isProduction || logLevel !== 'minimal') {
      console.log('🚀 [SERVER]', ...args);
    } else if (logLevel === 'minimal') {
      // Only essential server info in minimal mode
      console.log('🚀', ...args);
    }
  },

  // Mobile app logging
  mobile: (...args) => {
    if (!isProduction || logLevel !== 'minimal') {
      console.log('📱 [MOBILE]', ...args);
    } else {
      console.log('📱', ...args);
    }
  },

  // Silent logging - completely hidden in production unless debug enabled
  debug: (...args) => {
    if (!isProduction || enableDebugLogs) {
      console.log('🐛 [DEBUG]', ...args);
    }
  }
};

// Override global console.log in production
if (isProduction && !enableConsoleLogs) {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    // Only allow specific patterns in production based on log level
    const message = args.join(' ');
    
    if (logLevel === 'minimal') {
      // Only show critical messages in minimal mode
      if (message.includes('🔒') || message.includes('✅') || message.includes('❌')) {
        originalConsoleLog(...args);
      }
    } else if (logLevel === 'normal') {
      // Show server status and security info
      if (message.includes('🔒') || message.includes('✅') || message.includes('🚀') || 
          message.includes('📱') || message.includes('⚠️') || message.includes('❌')) {
        originalConsoleLog(...args);
      }
    }
    // All other console.log calls are hidden unless logLevel is 'verbose'
  };
}

module.exports = logger;
