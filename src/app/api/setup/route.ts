import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// This endpoint initializes the database by creating tables via raw SQL
// and seeding a default admin account.
// Call it ONCE after deployment: GET https://your-app.vercel.app/api/setup
export async function GET() {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    // Step 1: Create tables via raw SQL (idempotent)
    logs.push('[1/3] Creating database tables...')

    const createTableStatements = [
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "users_username_key" UNIQUE ("username")
      )`,
      `CREATE TABLE IF NOT EXISTS "pdf_documents" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "filename" TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        "totalPages" INTEGER NOT NULL,
        "fileData" BLOB NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "uploadedBy" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "pdf_documents_filename_key" UNIQUE ("filename")
      )`,
      `CREATE TABLE IF NOT EXISTS "page_assignments" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pdfId" TEXT NOT NULL,
        "pageNumbers" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "page_assignments_userId_pdfId_key" UNIQUE ("userId", "pdfId"),
        CONSTRAINT "page_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "page_assignments_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf_documents" ("id") ON DELETE CASCADE
      )`,
    ]

    for (const sql of createTableStatements) {
      try {
        await db.$executeRawUnsafe(sql)
        logs.push(`✓ Table created/verified: ${sql.match(/"(\w+)"/)?.[1] || 'unknown'}`)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        // Ignore "already exists" errors
        if (errMsg.includes('already exists')) {
          logs.push(`✓ Table already exists: ${sql.match(/"(\w+)"/)?.[1] || 'unknown'}`)
        } else {
          logs.push(`⚠ Table creation note: ${errMsg.substring(0, 200)}`)
        }
      }
    }

    // Step 2: Check if admin exists
    logs.push('[2/3] Checking for existing admin...')
    let admin
    try {
      admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logs.push(`Query error: ${errMsg.substring(0, 300)}`)
      return NextResponse.json({
        status: 'error',
        step: 'query-admin',
        logs,
        duration: `${Date.now() - startTime}ms`,
      }, { status: 500 })
    }

    if (admin) {
      logs.push(`✓ Admin already exists: ${admin.username}`)
      return NextResponse.json({
        status: 'success',
        message: 'Database ready. Admin already exists.',
        admin: { username: admin.username, name: admin.name },
        credentials: { username: 'admin', password: 'admin123' },
        logs,
        duration: `${Date.now() - startTime}ms`,
      })
    }

    // Step 3: Create default admin
    logs.push('[3/3] Creating default admin account...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    admin = await db.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
      },
      select: { id: true, username: true, name: true, role: true },
    })

    logs.push(`✓ Admin created: ${admin.username}`)

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized! You can now login.',
      admin: { username: admin.username, name: admin.name },
      credentials: {
        username: 'admin',
        password: 'admin123 (CHANGE THIS IMMEDIATELY AFTER LOGIN)',
      },
      logs,
      duration: `${Date.now() - startTime}ms`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logs.push(`Fatal error: ${errMsg.substring(0, 500)}`)
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
