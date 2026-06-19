import { NextResponse } from 'next/server'
import { getDb, getCurrentUser, row } from '@/lib/db-libsql'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (currentUser.role === 'ADMIN') {
      // Admin melihat semua PDF dengan semua halaman
      const result = await getDb().execute(
        `SELECT p.id, p.originalName, p.totalPages, p.createdAt
         FROM pdf_documents p
         ORDER BY p.createdAt DESC`
      )
      const pages = result.rows.map((r) => {
        const raw = row(r as Record<string, unknown>)
        const total = Number(raw.totalPages)
        return {
          id: String(raw.id),
          originalName: String(raw.originalName),
          totalPages: total,
          assignedPages: Array.from({ length: total }, (_, i) => i + 1),
          createdAt: raw.createdAt,
        }
      })
      return NextResponse.json({ pages })
    }

    // User biasa - hanya lihat yang di-assign
    const result = await getDb().execute({
      sql: `SELECT a.pageNumbers, a.createdAt, p.id AS pdfId, p.originalName, p.totalPages
            FROM page_assignments a
            JOIN pdf_documents p ON a.pdfId = p.id
            WHERE a.userId = ?
            ORDER BY a.createdAt DESC`,
      args: [currentUser.userId],
    })

    const pages = result.rows.map((r) => {
      const raw = row(r as Record<string, unknown>)
      return {
        id: String(raw.pdfId),
        originalName: String(raw.originalName),
        totalPages: Number(raw.totalPages),
        assignedPages: JSON.parse(String(raw.pageNumbers)) as number[],
        createdAt: raw.createdAt,
      }
    })

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Get my pages error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}
