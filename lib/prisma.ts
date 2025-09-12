import { PrismaClient } from '@prisma/client';
import { ConnectionPoolMonitor } from './connection-pool-monitor';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const getConstrainedUrl = (): string => {
  const raw = process.env.DATABASE_URL;
  if (!raw) return '';
  try {
    const u = new URL(raw);
    // Set aggressive connection pool limits to prevent exhaustion
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '3'); // Reduced from 5 to 3
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '5'); // Reduced timeout
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', '5'); // Reduced timeout
    }
    if (!u.searchParams.has('statement_timeout')) {
      u.searchParams.set('statement_timeout', '10000'); // 10 second statement timeout
    }
    return u.toString();
  } catch {
    return raw;
  }
};

// Enhanced Prisma client with connection monitoring
const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getConstrainedUrl(),
      },
    },
    log: ["error", "warn"],
  });

  // Add connection monitoring middleware
  client.$use(async (params, next) => {
    const start = Date.now();
    const context = `${params.model || 'unknown'}.${params.action}`;
    
    ConnectionPoolMonitor.trackConnection('acquire', context);
    
    try {
      const result = await next(params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 3000) {
        console.warn(`🐌 Slow query: ${context} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Query error in ${context}:`, error);
      throw error;
    } finally {
      ConnectionPoolMonitor.trackConnection('release', context);
    }
  });

  return client;
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Utility function to check connection pool health
export const checkConnectionHealth = () => {
  const status = ConnectionPoolMonitor.getStatus();
  
  if (status.activeConnections > 8) {
    console.warn('🚨 High connection usage detected:', status);
  }
  
  return status;
};

// Graceful shutdown handler
export const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
};