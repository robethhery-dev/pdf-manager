import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const getJwtSecret = () => {
  const s = process.env.JWT_SECRET || 'pdf-manager-secret-key-change-in-production'
  return new TextEncoder().encode(s)
}

async function createToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(getJwtSecret())
}

// Login route — bypass Prisma, pakai libSQL client langsung.
// Prisma + Vercel serverless + Turso sering bermasalah dgn env vars
// saat client di-instantiate. libSQL client lebih reliable.
export async function POST(req: NextRequest) {
  let client
  try {
    const url = process.env.DATABASE_URL
    if (!url) {
      return NextResponse.json(
        { error: 'DATABASE_URL belum diset di server' },
        { status: 500 }
      )
    }
    client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })
  } catch (e) {
    console.error('Login createClient error:', e)
    return NextResponse.json(
      { error: 'Gagal inisialisasi koneksi DB', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const username = body?.username
    const password = body?.password

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
    }

    // Cari user berdasarkan username
    let rows
    try {
      rows = await client.execute({
        sql: 'SELECT id, username, password, name, role FROM users WHERE username = ? LIMIT 1',
        args: [String(username)],
      })
    } catch (dbErr) {
      console.error('Login DB error:', dbErr)
      const msg = dbErr instanceof Error ? dbErr.message : 'DB error'
      return NextResponse.json(
        { error: 'Gagal mengakses database', detail: msg },
        { status: 500 }
      )
    }

    if (rows.rows.length === 0) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const user = rows.rows[0]
    const hashedPassword = String(user.password)

    // Verifikasi password
    let isValid = false
    try {
      isValid = await bcrypt.compare(String(password), hashedPassword)
    } catch (bcryptErr) {
      console.error('Login bcrypt error:', bcryptErr)
      const msg = bcryptErr instanceof Error ? bcryptErr.message : 'bcrypt error'
      return NextResponse.json(
        { error: 'Gagal verifikasi password', detail: msg },
        { status: 500 }
      )
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Buat JWT token
    let token: string
    try {
      token = await createToken({
        userId: String(user.id),
        username: String(user.username),
        role: String(user.role),
        name: String(user.name),
      })
    } catch (tokenErr) {
      console.error('Login token error:', tokenErr)
      const msg = tokenErr instanceof Error ? tokenErr.message : 'token error'
      return NextResponse.json(
        { error: 'Gagal membuat token autentikasi', detail: msg },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      user: {
        id: String(user.id),
        username: String(user.username),
        name: String(user.name),
        role: String(user.role),
      },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login unexpected error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', detail: msg },
      { status: 500 }
    )
  }
}
