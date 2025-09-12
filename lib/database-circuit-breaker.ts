/**
 * Circuit Breaker Pattern for Database Operations
 * Prevents cascading failures when database is overloaded
 */

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - too many database failures');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.error(`🔴 Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  private reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('🟢 Circuit breaker CLOSED - database recovered');
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breaker instance
export const databaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Open circuit after 5 failures
  resetTimeout: 30000, // Try again after 30 seconds
  monitoringPeriod: 60000 // Monitor failures over 1 minute
});

/**
 * Retry wrapper for database operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await databaseCircuitBreaker.execute(operation);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if circuit breaker is open
      if (lastError.message.includes('Circuit breaker is OPEN')) {
        throw lastError;
      }

      // Don't retry on authentication errors or invalid data
      if (lastError.message.includes('Unauthorized') || 
          lastError.message.includes('Invalid input')) {
        throw lastError;
      }

      console.warn(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Safe database query wrapper
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await withRetry(queryFn);
  } catch (error) {
    console.error('💥 Database query failed after retries:', error);
    
    if (fallbackValue !== undefined) {
      console.log('🔄 Using fallback value');
      return fallbackValue;
    }
    
    // Don't throw - return undefined to prevent app crashes
    return undefined;
  }
}
