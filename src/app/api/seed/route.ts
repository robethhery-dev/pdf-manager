import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Buat tabel langsung via libSQL client (idempotent).
// Ini memastikan schema ada meskipun `prisma db push` tidak berjalan saat build.
async function ensureSchema() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  // Hanya gunakan libSQL client untuk URL libsql:// / http(s)://
  if (
    url.startsWith('libsql://') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    const { createClient } = await import('@libsql/client')
    const client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })

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
  }
  // Untuk SQLite lokal (file:), Prisma db push sudah membuat tabel.
}

// Seed admin default (username: admin, password: admin123)
async function seedAdmin() {
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
    data: {
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      role: 'ADMIN',
    },
    select: { id: true, username: true, name: true, role: true },
  })

  return {
    seeded: true,
    message: 'Admin berhasil dibuat',
    admin,
  }
}

async function runSeed() {
  // 1. Pastikan schema ada
  await ensureSchema()
  // 2. Seed admin
  return await seedAdmin()
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
  try {
    const result = await runSeed()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Seed error (GET):', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan server saat seeding', detail: message },
      { status: 500 }
    )
  }
}
