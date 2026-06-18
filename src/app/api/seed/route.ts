import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Helper: deteksi tipe DATABASE_URL tanpa membocorkan secret
function describeDbUrl(url: string | undefined): {
  set: boolean
  prefix: string
  type: 'libsql' | 'http' | 'file' | 'unknown' | 'none'
  length: number
} {
  if (!url) {
    return { set: false, prefix: '(not set)', type: 'none', length: 0 }
  }
  let prefix = url.slice(0, 12)
  let type: 'libsql' | 'http' | 'file' | 'unknown' | 'none' = 'unknown'
  if (url.startsWith('libsql://')) type = 'libsql'
  else if (url.startsWith('http://') || url.startsWith('https://')) type = 'http'
  else if (url.startsWith('file:')) type = 'file'
  return { set: true, prefix: prefix + '...', type, length: url.length }
}

// Buat tabel langsung via libSQL client (idempotent, bypass Prisma).
// Hanya untuk URL libsql:// atau http(s)://
async function ensureSchemaLibsql(url: string, authToken?: string) {
  const { createClient } = await import('@libsql/client')
  const client = createClient({ url, authToken: authToken || undefined })

  await client.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  await client.execute(`CREATE TABLE IF NOT EXISTS pdf_documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    originalName TEXT NOT NULL,
    totalPages INTEGER NOT NULL,
    fileData BLOB NOT NULL,
    fileSize INTEGER NOT NULL,
    uploadedBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  await client.execute(`CREATE TABLE IF NOT EXISTS page_assignments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    pdfId TEXT NOT NULL,
    pageNumbers TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(userId, pdfId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pdfId) REFERENCES pdf_documents(id) ON DELETE CASCADE
  )`)

  return client
}

// Seed admin langsung via libSQL client (paling reliable, tidak butuh Prisma)
async function seedAdminLibsql(client: Awaited<ReturnType<typeof ensureSchemaLibsql>>) {
  const result = await client.execute(
    'SELECT id, username, name FROM users WHERE role = ? LIMIT 1',
    ['ADMIN']
  )

  if (result.rows.length > 0) {
    const admin = result.rows[0]
    return {
      seeded: false,
      message: 'Admin sudah ada',
      admin: { username: String(admin.username), name: String(admin.name) },
    }
  }

  const adminId = 'admin-' + Date.now()
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await client.execute({
    sql: 'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
    args: [adminId, 'admin', hashedPassword, 'Administrator', 'ADMIN'],
  })

  return {
    seeded: true,
    message: 'Admin berhasil dibuat',
    admin: { username: 'admin', name: 'Administrator' },
  }
}

async function runSeed() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const info = describeDbUrl(url)
  const isProd = process.env.NODE_ENV === 'production'

  // Validasi environment
  if (!info.set) {
    throw new Error(
      'DATABASE_URL belum diset. Untuk Vercel, set DATABASE_URL = libsql://... (URL Turso Anda) di Project Settings > Environment Variables.'
    )
  }

  if (info.type === 'file' && isProd) {
    throw new Error(
      `DATABASE_URL = "${info.prefix}" (SQLite file). ` +
        'SQLite file TIDAK bisa dipakai di Vercel (filesystem read-only). ' +
        'Set DATABASE_URL = libsql://... (URL Turso Anda) di Project Settings > Environment Variables, lalu redeploy.'
    )
  }

  if (info.type === 'unknown') {
    throw new Error(
      `DATABASE_URL format tidak dikenali: "${info.prefix}". ` +
        'Harus dimulai dengan "libsql://" (Turso) atau "file:" (local dev).'
    )
  }

  // Local SQLite file (dev only) -> gunakan Prisma
  if (info.type === 'file') {
    const { db } = await import('@/lib/db')
    const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } })
    if (existingAdmin) {
      return {
        seeded: false,
        message: 'Admin sudah ada',
        admin: { username: existingAdmin.username, name: existingAdmin.name },
      }
    }
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await db.user.create({
      data: { username: 'admin', password: hashedPassword, name: 'Administrator', role: 'ADMIN' },
      select: { id: true, username: true, name: true, role: true },
    })
    return { seeded: true, message: 'Admin berhasil dibuat', admin }
  }

  // Production path (libsql:// or http(s)://): langsung pakai libSQL client
  const client = await ensureSchemaLibsql(url!, authToken)
  return await seedAdminLibsql(client)
}

// POST handler - dipanggil dari frontend saat load
export async function POST() {
  try {
    const result = await runSeed()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Seed error (POST):', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat seeding', detail: message },
      { status: 500 }
    )
  }
}

// GET handler - untuk testing/debugging langsung dari browser
export async function GET() {
  const info = describeDbUrl(process.env.DATABASE_URL)
  const authTokenSet = !!process.env.DATABASE_AUTH_TOKEN
  const jwtSet = !!process.env.JWT_SECRET

  try {
    const result = await runSeed()
    return NextResponse.json({
      ok: true,
      ...result,
      env: {
        databaseUrl: info,
        authTokenSet,
        jwtSet,
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error('Seed error (GET):', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        ok: false,
        error: 'Terjadi kesalahan server saat seeding',
        detail: message,
        env: {
          databaseUrl: info,
          authTokenSet,
          jwtSet,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    )
  }
}
