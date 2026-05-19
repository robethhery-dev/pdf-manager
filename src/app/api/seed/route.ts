import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } })
    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin sudah ada', admin: { username: existingAdmin.username } })
    }

    // Create default admin
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

    return NextResponse.json({ message: 'Admin berhasil dibuat', admin })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
