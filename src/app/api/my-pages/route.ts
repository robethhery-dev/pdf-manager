import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (currentUser.role === 'ADMIN') {
      // Admin can see all PDFs with their full page count
      const pdfs = await db.pdfDocument.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            select: { id: true, userId: true, pageNumbers: true, user: { select: { name: true, username: true } } },
          },
        },
      })

      const formatted = pdfs.map((pdf) => ({
        id: pdf.id,
        originalName: pdf.originalName,
        totalPages: pdf.totalPages,
        assignedPages: Array.from({ length: pdf.totalPages }, (_, i) => i + 1), // Admin sees all pages
        assignments: pdf.assignments.map((a) => ({
          id: a.id,
          userId: a.userId,
          pageNumbers: JSON.parse(a.pageNumbers),
          user: a.user,
        })),
        createdAt: pdf.createdAt,
      }))

      return NextResponse.json({ pages: formatted })
    }

    // Regular user - only see assigned pages
    const assignments = await db.pageAssignment.findMany({
      where: { userId: currentUser.userId },
      include: {
        pdf: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = assignments.map((a) => ({
      id: a.pdfId,
      originalName: a.pdf.originalName,
      totalPages: a.pdf.totalPages,
      assignedPages: JSON.parse(a.pageNumbers),
      createdAt: a.createdAt,
    }))

    return NextResponse.json({ pages: formatted })
  } catch (error) {
    console.error('Get my pages error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
