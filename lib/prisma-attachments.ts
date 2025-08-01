import { PrismaClient } from '../node_modules/.prisma/attachments-client'

declare global {
  var prismaAttachments: PrismaClient | undefined
}

const prismaAttachments = globalThis.prismaAttachments || new PrismaClient({
  datasources: {
    db: {
      url: process.env.ATTACHMENTS_DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaAttachments = prismaAttachments
}

export { prismaAttachments }
