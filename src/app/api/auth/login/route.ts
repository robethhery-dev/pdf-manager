import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = body?.username
    const password = body?.password

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
    }

    // Cari user berdasarkan username
    let user
    try {
      user = await db.user.findUnique({ where: { username: String(username) } })
    } catch (dbErr) {
      console.error('Login DB error:', dbErr)
      const msg = dbErr instanceof Error ? dbErr.message : 'DB error'
      return NextResponse.json(
        { error: 'Gagal mengakses database', detail: msg },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Verifikasi password (bcryptjs pure JS, kompatibel dgn serverless)
    let isValid = false
    try {
      isValid = await bcrypt.compare(String(password), user.password)
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
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
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
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
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
