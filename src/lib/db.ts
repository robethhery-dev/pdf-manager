import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // If using Turso (libsql://), use the libSQL adapter
  if (url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://')) {
    // Dynamically import to avoid loading libsql when not needed (local dev)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Local SQLite file - use plain PrismaClient (most reliable)
  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
