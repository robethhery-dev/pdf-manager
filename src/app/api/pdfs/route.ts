import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PDFDocument } from 'pdf-lib'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const pdfs = await db.pdfDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          select: { id: true, userId: true, pageNumbers: true, user: { select: { name: true, username: true } } },
        },
      },
    })

    return NextResponse.json({ pdfs })
  } catch (error) {
    console.error('Get PDFs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
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

    // Read the file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get page count
    const pdfDoc = await PDFDocument.load(buffer)
    const totalPages = pdfDoc.getPageCount()

    // Save file
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const filename = `${randomUUID()}.pdf`
    const filePath = path.join(UPLOAD_DIR, filename)
    await writeFile(filePath, buffer)

    // Save to database
    const pdf = await db.pdfDocument.create({
      data: {
        filename,
        originalName: file.name,
        totalPages,
        filePath,
        uploadedBy: currentUser.userId,
      },
    })

    return NextResponse.json({ pdf }, { status: 201 })
  } catch (error) {
    console.error('Upload PDF error:', error)
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
      return NextResponse.json({ error: 'ID PDF harus diisi' }, { status: 400 })
    }

    const pdf = await db.pdfDocument.findUnique({ where: { id } })
    if (!pdf) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }

    // Delete file from disk
    if (existsSync(pdf.filePath)) {
      await unlink(pdf.filePath)
    }

    // Delete from database (assignments will cascade)
    await db.pdfDocument.delete({ where: { id } })

    return NextResponse.json({ message: 'PDF berhasil dihapus' })
  } catch (error) {
    console.error('Delete PDF error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// GET individual PDF view - extracts only assigned pages for user
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

    const pdf = await db.pdfDocument.findUnique({ where: { id: pdfId } })
    if (!pdf) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }

    // Verify access for non-admin users
    if (currentUser.role !== 'ADMIN') {
      const assignment = await db.pageAssignment.findUnique({
        where: { userId_pdfId: { userId: currentUser.userId, pdfId } },
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Anda tidak memiliki akses ke PDF ini' }, { status: 403 })
      }
      // Verify requested pages are within assigned pages
      const assignedPages = JSON.parse(assignment.pageNumbers) as number[]
      const requestedPages = pageNumbers as number[]
      const hasAccess = requestedPages.every((p) => assignedPages.includes(p))
      if (!hasAccess) {
        return NextResponse.json({ error: 'Anda tidak memiliki akses ke halaman ini' }, { status: 403 })
      }
    }

    // Read the PDF file
    const pdfBytes = await readFile(pdf.filePath)
    const srcDoc = await PDFDocument.load(pdfBytes)
    const newDoc = await PDFDocument.create()

    // Copy only requested pages
    const validPageNumbers = (pageNumbers as number[])
      .filter((p) => p >= 1 && p <= pdf.totalPages)
      .sort((a, b) => a - b)

    for (const pageNum of validPageNumbers) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]) // 0-indexed
      newDoc.addPage(copiedPage)
    }

    const pdfBytesResult = await newDoc.save()

    return new NextResponse(pdfBytesResult, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdf.originalName}"`,
      },
    })
  } catch (error) {
    console.error('View PDF error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
