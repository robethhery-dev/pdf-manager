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

// LAZY INITIALIZATION — hindari instantiate Prisma/libSQL saat build time.
// Module-level instantiation bisa crash `next build` karena process.env.DATABASE_URL
// mungkin undefined saat Next.js collect static page data.
let _db: PrismaClient | null = null

function getDb(): PrismaClient {
  if (_db) return _db
  _db = globalForPrisma.prisma ?? createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

// Proxy agar `import { db }` tetap kompatibel, tapi instantiasi tertunda sampai dipakai.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  },
}) as PrismaClient
