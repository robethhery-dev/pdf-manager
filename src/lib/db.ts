import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
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

let _db: PrismaClient | null = null

function getDb(): PrismaClient {
  if (_db) return _db
  const client = globalForPrisma.prisma ?? createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  _db = client
  return _db
}

// Lazy proxy: akses `db.user.findUnique(...)` tidak akan instantiate Prisma
// sampai `findUnique` benar-benar dipanggil (saat runtime, bukan build time).
// Setiap property access mengembalikan proxy lain, dan hanya function call
// yang trigger getDb().
function makeLazyProxy(path: string[] = []): unknown {
  const fn = function (...args: unknown[]) {
    // Ini dipanggil saat proxy digunakan sebagai function (mis. db(...))
    const client = getDb() as unknown as Record<string, unknown>
    let cur: unknown = client
    for (const p of path) {
      cur = (cur as Record<string, unknown>)[p]
    }
    return typeof cur === 'function' ? (cur as (...a: unknown[]) => unknown).apply(
      (client as Record<string, unknown>)[path[0] ?? ''] ?? client,
      args
    ) : cur
  }
  return new Proxy(fn, {
    get(_t, prop) {
      if (typeof prop === 'string') {
        return makeLazyProxy([...path, prop])
      }
      return undefined
    },
    apply(_t, _thisArg, args) {
      const client = getDb() as unknown as Record<string, unknown>
      let cur: unknown = client
      for (const p of path) {
        cur = (cur as Record<string, unknown>)[p]
      }
      if (typeof cur === 'function') {
        // bind `this` ke parent object agar Prisma delegate jalan
        let parent: unknown = client
        for (let i = 0; i < path.length - 1; i++) {
          parent = (parent as Record<string, unknown>)[path[i]]
        }
        const thisArg = path.length > 0
          ? (client as Record<string, unknown>)[path[0]]
          : client
        return (cur as (...a: unknown[]) => unknown).apply(thisArg, args)
      }
      return cur
    },
  })
}

export const db = makeLazyProxy() as PrismaClient
