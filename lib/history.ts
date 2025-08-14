import { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, '$executeRaw' | 'requestHistory'> & {
  $executeRawUnsafe?: (query: string, ...params: any[]) => Promise<any>;
  requestHistory: {
    create: (args: any) => Promise<any>;
  };
};

export interface HistoryData {
  requestId: number;
  action: string;
  details?: string | null;
  actorId?: number | null;
  actorName?: string | null;
  actorType?: string | null;
}

// Inserts a request_history row with Philippine local time stored directly
export const addHistory = async (db: PrismaLike, data: HistoryData): Promise<void> => {
  // Create Philippine time by manually adjusting UTC
  const now = new Date();
  // Add 8 hours to UTC to get Philippine time (UTC+8)
  const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  // Use Prisma's create method instead of raw SQL for consistency
  await db.requestHistory.create({
    data: {
      requestId: data.requestId,
      action: data.action,
      details: data.details ?? null,
      actorId: data.actorId ?? null,
      actorName: data.actorName ?? null,
      actorType: data.actorType ?? 'system',
      timestamp: philippineTime,
    }
  });
};
