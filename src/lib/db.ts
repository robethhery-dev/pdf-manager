import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      'DATABASE_URL belum diset. Set di Vercel: DATABASE_URL = libsql://... (URL Turso)'
    )
  }

  // If using Turso (libsql://) or any HTTP URL, use the libSQL adapter
  if (url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://')) {
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // Local SQLite file - hanya untuk development
  if (url.startsWith('file:')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL = "file:..." tidak bisa dipakai di production (Vercel filesystem read-only). ' +
          'Set DATABASE_URL = libsql://... (URL Turso) di Vercel Environment Variables.'
      )
    }
    return new PrismaClient()
  }

  throw new Error(
    `DATABASE_URL format tidak dikenali: "${url.slice(0, 20)}...". ` +
      'Harus "libsql://...", "http(s)://...", atau "file:...".'
  )
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// Cache the client globally to avoid creating new instances on every hot-reload / request
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
