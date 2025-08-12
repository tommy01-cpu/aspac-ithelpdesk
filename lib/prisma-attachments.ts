import { PrismaClient } from '../node_modules/.prisma/attachments-client'

type GlobalWithAttachments = typeof globalThis & { prismaAttachments?: PrismaClient }
const g = globalThis as GlobalWithAttachments

if (!g.prismaAttachments) {
  g.prismaAttachments = new PrismaClient({
    datasources: {
      db: {
        url: process.env.ATTACHMENTS_DATABASE_URL
      }
    }
  })
}

export const prismaAttachments = g.prismaAttachments
