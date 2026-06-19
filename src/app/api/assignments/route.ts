import { NextRequest, NextResponse } from 'next/server'
import { getDb, getCurrentUser, row } from '@/lib/db-libsql'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const result = await getDb().execute(
      `SELECT a.id, a.userId, a.pdfId, a.pageNumbers, a.createdAt,
              u.username AS user_username, u.name AS user_name,
              p.originalName AS pdf_originalName, p.totalPages AS pdf_totalPages
       FROM page_assignments a
       LEFT JOIN users u ON a.userId = u.id
       LEFT JOIN pdf_documents p ON a.pdfId = p.id
       ORDER BY a.createdAt DESC`
    )

    const assignments = result.rows.map((r) => {
      const raw = row(r as Record<string, unknown>)
      return {
        id: String(raw.id),
        userId: String(raw.userId),
        pdfId: String(raw.pdfId),
        pageNumbers: JSON.parse(String(raw.pageNumbers)) as number[],
        user: {
          id: String(raw.userId),
          username: String(raw.user_username),
          name: String(raw.user_name),
        },
        pdf: {
          id: String(raw.pdfId),
          originalName: String(raw.pdf_originalName),
          totalPages: Number(raw.pdf_totalPages),
        },
        createdAt: raw.createdAt,
      }
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Get assignments error:', error)
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

    const { userId, pdfId, pageNumbers } = await req.json()
    if (!userId || !pdfId || !pageNumbers || !Array.isArray(pageNumbers)) {
      return NextResponse.json({ error: 'User, PDF, dan nomor halaman harus diisi' }, { status: 400 })
    }

    // Verify user
    const userRes = await getDb().execute({
      sql: 'SELECT id, username, name FROM users WHERE id = ? LIMIT 1',
      args: [String(userId)],
    })
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    const userRow = row(userRes.rows[0] as Record<string, unknown>)

    // Verify PDF
    const pdfRes = await getDb().execute({
      sql: 'SELECT id, originalName, totalPages FROM pdf_documents WHERE id = ? LIMIT 1',
      args: [String(pdfId)],
    })
    if (pdfRes.rows.length === 0) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }
    const pdfRow = row(pdfRes.rows[0] as Record<string, unknown>)

    // Validate pages
    const totalPages = Number(pdfRow.totalPages)
    const validPages = (pageNumbers as number[])
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
    const uniquePages = [...new Set(validPages)]
    if (uniquePages.length === 0) {
      return NextResponse.json({ error: 'Nomor halaman tidak valid' }, { status: 400 })
    }

    const pageNumbersJson = JSON.stringify(uniquePages)

    // Upsert (check existing)
    const existing = await getDb().execute({
      sql: 'SELECT id FROM page_assignments WHERE userId = ? AND pdfId = ? LIMIT 1',
      args: [String(userId), String(pdfId)],
    })

    let assignmentId: string
    if (existing.rows.length > 0) {
      assignmentId = String((row(existing.rows[0] as Record<string, unknown>)).id)
      await getDb().execute({
        sql: "UPDATE page_assignments SET pageNumbers = ?, updatedAt = datetime('now') WHERE id = ?",
        args: [pageNumbersJson, assignmentId],
      })
    } else {
      assignmentId = randomUUID()
      await getDb().execute({
        sql: 'INSERT INTO page_assignments (id, userId, pdfId, pageNumbers) VALUES (?, ?, ?, ?)',
        args: [assignmentId, String(userId), String(pdfId), pageNumbersJson],
      })
    }

    return NextResponse.json({
      assignment: {
        id: assignmentId,
        userId: String(userId),
        pdfId: String(pdfId),
        pageNumbers: uniquePages,
        user: { id: String(userId), username: String(userRow.username), name: String(userRow.name) },
        pdf: { id: String(pdfId), originalName: String(pdfRow.originalName), totalPages },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create assignment error:', error)
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
      return NextResponse.json({ error: 'ID assignment harus diisi' }, { status: 400 })
    }

    await getDb().execute({ sql: 'DELETE FROM page_assignments WHERE id = ?', args: [id] })
    return NextResponse.json({ message: 'Assignment berhasil dihapus' })
  } catch (error) {
    console.error('Delete assignment error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}
