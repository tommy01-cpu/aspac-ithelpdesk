import { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, '$executeRaw'> & {
  $executeRawUnsafe?: (query: string, ...params: any[]) => Promise<any>;
};

export interface HistoryData {
  requestId: number;
  action: string;
  details?: string | null;
  actorId?: number | null;
  actorName?: string | null;
  actorType?: string | null;
}

// Inserts a request_history row with timestamp computed in the database as Asia/Manila local time.
export const addHistory = async (db: PrismaLike, data: HistoryData): Promise<void> => {
  await db.$executeRaw`
    INSERT INTO request_history ("requestId", action, details, "actorId", "actorName", "actorType", timestamp)
    VALUES (
      ${data.requestId},
      ${data.action},
      ${data.details ?? null},
      ${data.actorId ?? null},
      ${data.actorName ?? null},
      ${data.actorType ?? 'system'},
      (NOW() AT TIME ZONE 'Asia/Manila')
    )
  `;
};
