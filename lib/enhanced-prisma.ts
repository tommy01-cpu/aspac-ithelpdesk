import { PrismaClient } from '@prisma/client';
import { ConnectionPoolMonitor } from './connection-pool-monitor';

/**
 * Enhanced Prisma wrapper with connection management
 */
class EnhancedPrismaClient extends PrismaClient {
  constructor(options?: any) {
    super({
      ...options,
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: options?.datasources?.db?.url || process.env.DATABASE_URL,
        },
      },
    });

    // Hook into query events for connection tracking
    this.$use(async (params, next) => {
      const start = Date.now();
      const context = `${params.model || 'unknown'}.${params.action}`;
      
      ConnectionPoolMonitor.trackConnection('acquire', context);
      
      try {
        const result = await next(params);
        return result;
      } finally {
        ConnectionPoolMonitor.trackConnection('release', context);
        
        const duration = Date.now() - start;
        if (duration > 5000) {
          console.warn(`🐌 Slow query detected: ${context} took ${duration}ms`);
        }
      }
    });
  }

  /**
   * Safe transaction wrapper with timeout
   */
  async safeTransaction<T>(
    operations: (prisma: any) => Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs);
    });

    return Promise.race([
      this.$transaction(operations as any),
      timeoutPromise
    ]) as Promise<T>;
  }

  /**
   * Batch operations to prevent connection exhaustion
   */
  async batchQuery<T, R>(
    items: T[],
    queryFn: (item: T, prisma: any) => Promise<R>,
    batchSize: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => queryFn(item, this))
      );
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the pool
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return results;
  }

  /**
   * Get connection pool status
   */
  getConnectionStatus() {
    return ConnectionPoolMonitor.getStatus();
  }
}

export { EnhancedPrismaClient };
