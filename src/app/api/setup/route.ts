import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

// This endpoint runs prisma db push + seeds admin
// Call it ONCE after deployment to initialize the database
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    // Optional: protect with a setup secret
    const setupSecret = process.env.SETUP_SECRET
    if (setupSecret) {
      const body = await req.json().catch(() => ({}))
      if (body?.secret !== setupSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Step 1: Run prisma db push to create tables
    logs.push('[1/3] Running prisma db push...')
    try {
      const output = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        encoding: 'utf8',
        timeout: 60000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      })
      logs.push('Schema pushed successfully')
      logs.push(output.substring(0, 500))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logs.push(`Schema push error: ${errMsg.substring(0, 300)}`)
      // Continue anyway - tables might already exist
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
        error: 'Database query failed. Schema might not be created.',
        logs,
        hint: 'Run prisma db push manually: npx prisma db push',
      }, { status: 500 })
    }

    if (admin) {
      logs.push('Admin already exists')
      return NextResponse.json({
        message: 'Database already initialized. Admin exists.',
        admin: { username: admin.username },
        logs,
        duration: `${Date.now() - startTime}ms`,
      })
    }

    // Step 3: Create default admin
    logs.push('[3/3] Creating default admin...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const newAdmin = await db.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
      },
      select: { id: true, username: true, name: true, role: true },
    })

    logs.push('Admin created successfully')

    return NextResponse.json({
      message: 'Database initialized successfully!',
      admin: newAdmin,
      credentials: {
        username: 'admin',
        password: 'admin123 (CHANGE THIS IMMEDIATELY)',
      },
      logs,
      duration: `${Date.now() - startTime}ms`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logs.push(`Fatal error: ${errMsg}`)
    return NextResponse.json({
      error: 'Setup failed',
      logs,
      duration: `${Date.now() - startTime}ms`,
    }, { status: 500 })
  }
}

// GET endpoint for easy browser-based setup
export async function GET() {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    logs.push('[1/3] Running prisma db push...')

    // Step 1: Push schema
    try {
      const output = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        encoding: 'utf8',
        timeout: 60000,
        env: { ...process.env, NODE_ENV: 'production' },
      })
      logs.push('Schema pushed: ' + output.substring(0, 200))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logs.push('Schema push note: ' + errMsg.substring(0, 200))
    }

    // Step 2: Check admin
    logs.push('[2/3] Checking admin...')
    let admin
    try {
      admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logs.push('Query error: ' + errMsg.substring(0, 300))
      return NextResponse.json({
        status: 'error',
        step: 'query-admin',
        logs,
        duration: `${Date.now() - startTime}ms`,
      }, { status: 500 })
    }

    if (admin) {
      logs.push('Admin exists: ' + admin.username)
      return NextResponse.json({
        status: 'success',
        message: 'Database ready. Admin exists.',
        admin: { username: admin.username, name: admin.name },
        credentials: { username: 'admin', password: 'admin123' },
        logs,
        duration: `${Date.now() - startTime}ms`,
      })
    }

    // Step 3: Create admin
    logs.push('[3/3] Creating admin...')
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

    logs.push('Admin created: ' + admin.username)

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized! You can now login.',
      admin: { username: admin.username, name: admin.name },
      credentials: { username: 'admin', password: 'admin123' },
      logs,
      duration: `${Date.now() - startTime}ms`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logs.push('Fatal: ' + errMsg)
    return NextResponse.json({
      status: 'error',
      logs,
      duration: `${Date.now() - startTime}ms`,
    }, { status: 500 })
  }
}
