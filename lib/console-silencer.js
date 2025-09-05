/**
 * Console silencer utility
 * Completely disables console output in production
 * Import this at the top of any file to silence console.log globally
 */

if (process.env.NODE_ENV === 'production') {
  // Store original functions
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTrace = console.trace;

  // Override console methods to do nothing
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};

  // Keep warnings and errors for debugging
  // console.warn and console.error remain active

  // If you want to restore logging for testing, export the restore function
  global.restoreConsole = () => {
    console.log = originalLog;
    console.info = originalInfo;
    console.debug = originalDebug;
    console.trace = originalTrace;
  };
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
