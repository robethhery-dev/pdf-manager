import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || 'file:./db/custom.db'

  // Create libSQL client - works with both file: (local SQLite) and libsql:// (Turso)
  const libsql = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  })

  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
