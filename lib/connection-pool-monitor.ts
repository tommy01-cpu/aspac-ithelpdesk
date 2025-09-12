/**
 * Database Connection Pool Monitor
 * Helps track and manage database connections to prevent exhaustion
 */

let activeConnections = 0;
let maxConnections = 0;
const connectionLog: Array<{ timestamp: Date; action: string; count: number }> = [];

export class ConnectionPoolMonitor {
  static trackConnection(action: 'acquire' | 'release', context?: string) {
    if (action === 'acquire') {
      activeConnections++;
      maxConnections = Math.max(maxConnections, activeConnections);
    } else {
      activeConnections = Math.max(0, activeConnections - 1);
    }

    // Keep only last 100 entries
    if (connectionLog.length > 100) {
      connectionLog.shift();
    }

    connectionLog.push({
      timestamp: new Date(),
      action: `${action}${context ? ` (${context})` : ''}`,
      count: activeConnections
    });

    // Warn if connections are getting high
    if (activeConnections > 8) {
      console.warn(`🚨 High connection count: ${activeConnections} active connections`);
    }
  }

  static getStatus() {
    return {
      activeConnections,
      maxConnections,
      recentActivity: connectionLog.slice(-10)
    };
  }

  static logStatus() {
    const status = this.getStatus();
    console.log('📊 Connection Pool Status:', {
      active: status.activeConnections,
      max: status.maxConnections,
      recent: status.recentActivity.length
    });
  }

  static reset() {
    activeConnections = 0;
    maxConnections = 0;
    connectionLog.length = 0;
  }
}

/**
 * Wrapper for Prisma operations with connection tracking
 */
export function withConnectionTracking<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  ConnectionPoolMonitor.trackConnection('acquire', context);
  
  return operation()
    .finally(() => {
      ConnectionPoolMonitor.trackConnection('release', context);
    });
}

/**
 * Batch process items to prevent connection exhaustion
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
    
    // Add delay between batches if specified
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
