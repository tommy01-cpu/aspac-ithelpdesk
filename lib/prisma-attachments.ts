import { PrismaClient } from '../node_modules/.prisma/attachments-client'

type GlobalWithAttachments = typeof globalThis & { prismaAttachments?: PrismaClient }
const g = globalThis as GlobalWithAttachments

// Build a constrained connection string to avoid exhausting Postgres max_connections
function getConstrainedAttachmentsUrl(): string {
  const raw = process.env.ATTACHMENTS_DATABASE_URL
  if (!raw) {
    throw new Error('ATTACHMENTS_DATABASE_URL is not set')
  }
  try {
    const u = new URL(raw)
    // Simple connection limits
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '5')
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '10')
    }
    return u.toString()
  } catch {
    // If URL parsing fails, fall back to the raw string
    return raw
  }
}

if (!g.prismaAttachments) {
  g.prismaAttachments = new PrismaClient({
    datasources: {
      db: {
        url: getConstrainedAttachmentsUrl(),
      },
    },
    log: ['error', 'warn'],
  })
}

export const prismaAttachments = g.prismaAttachments

// Helper function to ensure connection
export async function ensureAttachmentsConnection() {
  try {
    await prismaAttachments.$connect()
    return true
  } catch (error) {
    console.error('Failed to connect to attachments database:', error)
    return false
  }
}
