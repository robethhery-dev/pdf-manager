import { NextRequest, NextResponse } from 'next/server'
import { getDb, getCurrentUser, row } from '@/lib/db-libsql'
import { PDFDocument } from 'pdf-lib'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const result = await getDb().execute(
      `SELECT p.id, p.filename, p.originalName, p.totalPages, p.fileSize, p.uploadedBy, p.createdAt, p.updatedAt
       FROM pdf_documents p
       ORDER BY p.createdAt DESC`
    )

    // Ambil assignments terpisah (avoid large JOIN)
    const pdfIds = result.rows.map((r) => String((row(r as Record<string, unknown>)).id))
    let assignmentsByPdf: Record<string, Array<Record<string, unknown>>> = {}
    if (pdfIds.length > 0) {
      const placeholders = pdfIds.map(() => '?').join(',')
      const aRes = await getDb().execute({
        sql: `SELECT a.id, a.userId, a.pdfId, a.pageNumbers, u.name AS user_name, u.username AS user_username
              FROM page_assignments a
              LEFT JOIN users u ON a.userId = u.id
              WHERE a.pdfId IN (${placeholders})`,
        args: pdfIds,
      })
      for (const r of aRes.rows) {
        const raw = row(r as Record<string, unknown>)
        const pdfId = String(raw.pdfId)
        if (!assignmentsByPdf[pdfId]) assignmentsByPdf[pdfId] = []
        assignmentsByPdf[pdfId].push({
          id: String(raw.id),
          userId: String(raw.userId),
          pageNumbers: JSON.parse(String(raw.pageNumbers)),
          user: { name: String(raw.user_name), username: String(raw.user_username) },
        })
      }
    }

    const pdfs = result.rows.map((r) => {
      const raw = row(r as Record<string, unknown>)
      return {
        id: String(raw.id),
        filename: String(raw.filename),
        originalName: String(raw.originalName),
        totalPages: Number(raw.totalPages),
        fileSize: Number(raw.fileSize),
        uploadedBy: String(raw.uploadedBy),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        assignments: assignmentsByPdf[String(raw.id)] || [],
      }
    })

    return NextResponse.json({ pdfs })
  } catch (error) {
    console.error('Get PDFs error:', error)
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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File PDF harus diupload' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File harus berformat PDF' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const pdfDoc = await PDFDocument.load(buffer)
    const totalPages = pdfDoc.getPageCount()

    const id = randomUUID()
    const filename = `${randomUUID()}.pdf`

    await getDb().execute({
      sql: 'INSERT INTO pdf_documents (id, filename, originalName, totalPages, fileData, fileSize, uploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, filename, file.name, totalPages, buffer, buffer.length, currentUser.userId],
    })

    return NextResponse.json({
      pdf: {
        id,
        filename,
        originalName: file.name,
        totalPages,
        fileSize: buffer.length,
        uploadedBy: currentUser.userId,
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Upload PDF error:', error)
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
      return NextResponse.json({ error: 'ID PDF harus diisi' }, { status: 400 })
    }

    // Hapus assignments dulu (cascade), lalu PDF
    await getDb().execute({ sql: 'DELETE FROM page_assignments WHERE pdfId = ?', args: [id] })
    await getDb().execute({ sql: 'DELETE FROM pdf_documents WHERE id = ?', args: [id] })

    return NextResponse.json({ message: 'PDF berhasil dihapus' })
  } catch (error) {
    console.error('Delete PDF error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}

// Extract specific pages — access controlled
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { pdfId, pageNumbers } = await req.json()
    if (!pdfId || !pageNumbers) {
      return NextResponse.json({ error: 'PDF ID dan nomor halaman harus diisi' }, { status: 400 })
    }

    const result = await getDb().execute({
      sql: 'SELECT id, originalName, totalPages, fileData FROM pdf_documents WHERE id = ? LIMIT 1',
      args: [String(pdfId)],
    })
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }
    const raw = row(result.rows[0] as Record<string, unknown>)
    const totalPages = Number(raw.totalPages)
    const fileData = raw.fileData as Buffer | Uint8Array

    // Verify access for non-admin
    if (currentUser.role !== 'ADMIN') {
      const aRes = await getDb().execute({
        sql: 'SELECT pageNumbers FROM page_assignments WHERE userId = ? AND pdfId = ? LIMIT 1',
        args: [currentUser.userId, String(pdfId)],
      })
      if (aRes.rows.length === 0) {
        return NextResponse.json({ error: 'Anda tidak memiliki akses ke PDF ini' }, { status: 403 })
      }
      const assignedPages = JSON.parse(String((row(aRes.rows[0] as Record<string, unknown>)).pageNumbers)) as number[]
      const requestedPages = pageNumbers as number[]
      const hasAccess = requestedPages.every((p) => assignedPages.includes(p))
      if (!hasAccess) {
        return NextResponse.json({ error: 'Anda tidak memiliki akses ke halaman ini' }, { status: 403 })
      }
    }

    const srcDoc = await PDFDocument.load(fileData)
    const newDoc = await PDFDocument.create()

    const validPageNumbers = (pageNumbers as number[])
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)

    for (const pageNum of validPageNumbers) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1])
      newDoc.addPage(copiedPage)
    }

    const pdfBytesResult = await newDoc.save()

    return new NextResponse(Buffer.from(pdfBytesResult), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${String(raw.originalName)}"`,
      },
    })
  } catch (error) {
    console.error('View PDF error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json({ error: 'Terjadi kesalahan server', detail: msg }, { status: 500 })
  }
}
