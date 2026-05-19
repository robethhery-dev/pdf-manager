import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const assignments = await db.pageAssignment.findMany({
      include: {
        user: { select: { id: true, username: true, name: true } },
        pdf: { select: { id: true, originalName: true, totalPages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format for the frontend
    const formatted = assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      pdfId: a.pdfId,
      pageNumbers: JSON.parse(a.pageNumbers) as number[],
      user: a.user,
      pdf: a.pdf,
      createdAt: a.createdAt,
    }))

    return NextResponse.json({ assignments: formatted })
  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { userId, pdfId, pageNumbers } = await req.json()

    if (!userId || !pdfId || !pageNumbers || !Array.isArray(pageNumbers)) {
      return NextResponse.json({ error: 'User, PDF, dan nomor halaman harus diisi' }, { status: 400 })
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Verify PDF exists
    const pdf = await db.pdfDocument.findUnique({ where: { id: pdfId } })
    if (!pdf) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }

    // Validate page numbers
    const validPages = (pageNumbers as number[]).filter((p) => p >= 1 && p <= pdf.totalPages)
    if (validPages.length === 0) {
      return NextResponse.json({ error: 'Nomor halaman tidak valid' }, { status: 400 })
    }

    // Upsert assignment
    const assignment = await db.pageAssignment.upsert({
      where: { userId_pdfId: { userId, pdfId } },
      update: { pageNumbers: JSON.stringify([...new Set(validPages)].sort((a, b) => a - b)) },
      create: {
        userId,
        pdfId,
        pageNumbers: JSON.stringify([...new Set(validPages)].sort((a, b) => a - b)),
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
        pdf: { select: { id: true, originalName: true, totalPages: true } },
      },
    })

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        userId: assignment.userId,
        pdfId: assignment.pdfId,
        pageNumbers: JSON.parse(assignment.pageNumbers),
        user: assignment.user,
        pdf: assignment.pdf,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create assignment error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
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
      return NextResponse.json({ error: 'ID assignment harus diisi' }, { status: 400 })
    }

    await db.pageAssignment.delete({ where: { id } })

    return NextResponse.json({ message: 'Assignment berhasil dihapus' })
  } catch (error) {
    console.error('Delete assignment error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
