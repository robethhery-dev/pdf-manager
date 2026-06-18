import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

// Direct libSQL setup endpoint - bypasses Prisma entirely
// This is the most reliable way to initialize Turso database
export async function GET() {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    const url = process.env.DATABASE_URL
    const authToken = process.env.DATABASE_AUTH_TOKEN

    if (!url) {
      return NextResponse.json({
        status: 'error',
        message: 'DATABASE_URL is not set',
        logs,
      }, { status: 500 })
    }

    logs.push(`[0] Connecting to: ${url.substring(0, 30)}...`)

    // Create direct libSQL client
    const client = createClient({
      url,
      authToken: authToken || undefined,
    })

    // Step 1: Create tables
    logs.push('[1/4] Creating users table...')
    await client.execute(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    logs.push('✓ users table ready')

    logs.push('[2/4] Creating pdf_documents table...')
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
    logs.push('✓ pdf_documents table ready')

    logs.push('[3/4] Creating page_assignments table...')
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
    logs.push('✓ page_assignments table ready')

    // Step 4: Check & create admin
    logs.push('[4/4] Checking admin...')
    const result = await client.execute('SELECT id, username, name FROM users WHERE role = ? LIMIT 1', ['ADMIN'])

    if (result.rows.length > 0) {
      const admin = result.rows[0]
      logs.push(`✓ Admin already exists: ${admin.username}`)
      return NextResponse.json({
        status: 'success',
        message: 'Database ready. Admin exists.',
        admin: { username: admin.username, name: admin.name },
        credentials: { username: 'admin', password: 'admin123' },
        logs,
        duration: `${Date.now() - startTime}ms`,
      })
    }

    // Create default admin
    logs.push('Creating default admin...')
    const adminId = 'admin-' + Date.now()
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await client.execute({
      sql: `INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`,
      args: [adminId, 'admin', hashedPassword, 'Administrator', 'ADMIN'],
    })
    logs.push('✓ Admin created: admin / admin123')

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized! You can now login.',
      admin: { username: 'admin', name: 'Administrator' },
      credentials: {
        username: 'admin',
        password: 'admin123 (CHANGE THIS IMMEDIATELY)',
      },
      logs,
      duration: `${Date.now() - startTime}ms`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logs.push(`Fatal: ${errMsg.substring(0, 500)}`)
    return NextResponse.json({
      status: 'error',
      message: 'Setup failed',
      logs,
      duration: `${Date.now() - startTime}ms`,
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
