import { NextRequest, NextResponse } from 'next/server'
import { getDb, getCurrentUser, row } from '@/lib/db-libsql'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const result = await getDb().execute(
      'SELECT id, username, name, role, createdAt FROM users ORDER BY createdAt DESC'
    )
    const users = result.rows.map((r) => row(r as Record<string, unknown>))
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { username, password, name, role } = await req.json()
    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Username, password, dan nama harus diisi' }, { status: 400 })
    }

    const existing = await getDb().execute({
      sql: 'SELECT id FROM users WHERE username = ? LIMIT 1',
      args: [String(username)],
    })
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(String(password), 10)
    const id = randomUUID()
    await getDb().execute({
      sql: 'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
      args: [id, String(username), hashedPassword, String(name), String(role || 'USER')],
    })

    return NextResponse.json({
      user: { id, username, name, role: role || 'USER', createdAt: new Date().toISOString() },
    }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id, username, password, name, role } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID user harus diisi' }, { status: 400 })
    }

    const sets: string[] = []
    const args: (string | number)[] = []
    if (username) { sets.push('username = ?'); args.push(String(username)) }
    if (name) { sets.push('name = ?'); args.push(String(name)) }
    if (role) { sets.push('role = ?'); args.push(String(role)) }
    if (password) {
      const hashed = await bcrypt.hash(String(password), 10)
      sets.push('password = ?'); args.push(hashed)
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
    }
    args.push(String(id))

    await getDb().execute({
      sql: `UPDATE users SET ${sets.join(', ')}, updatedAt = datetime('now') WHERE id = ?`,
      args,
    })

    const result = await getDb().execute({
      sql: 'SELECT id, username, name, role, createdAt FROM users WHERE id = ? LIMIT 1',
      args: [String(id)],
    })
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    const user = row(result.rows[0] as Record<string, unknown>)
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Update user error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID user harus diisi' }, { status: 400 })
    }
    if (id === currentUser.userId) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
    }

    await getDb().execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] })
    return NextResponse.json({ message: 'User berhasil dihapus' })
  } catch (error) {
    console.error('Delete user error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}
