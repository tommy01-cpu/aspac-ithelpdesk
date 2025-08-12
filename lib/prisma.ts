import { PrismaClient } from '@prisma/client';

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient };
const g = globalThis as GlobalWithPrisma;

if (!g.prisma) {
  // Create once per process; reuse across hot reloads and route reloads
  g.prisma = new PrismaClient({
    // Enable minimal logging to help spot accidental re-instantiation
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
}

export const prisma = g.prisma;