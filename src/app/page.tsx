'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/components/pdf-manager/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  FileText, Users, Shield, Upload, Trash2, Plus, LogOut, Eye, Lock, UserPlus,
  BookOpen, ChevronLeft, ChevronRight, FileUp, Settings, LayoutDashboard,
  KeyRound, UserCog, CheckCircle2, XCircle, Download
} from 'lucide-react'

// ===================== LOGIN SCREEN =====================
function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAppStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(username, password)
    if (!success) {
      setError('Username atau password salah')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF6EE] via-[#E8DFC8] to-[#7BA87A]/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-forest to-leaf rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-forest">PDF Manager</CardTitle>
          <CardDescription className="text-base text-bark-light">
            Kelola akses halaman PDF dengan mudah dan aman
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Masuk
                </span>
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}

// ===================== HEADER =====================
function AppHeader() {
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-white/95 to-parchment/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-sand/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-forest to-leaf rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-forest">PDF Manager</h1>
            <p className="text-xs text-wood hidden sm:block">Kelola Akses Dokumen PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-parchment/80 px-3 py-1.5 rounded-lg border border-sand/20">
            <div className="w-7 h-7 bg-forest/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-forest">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === 'ADMIN' ? 'Administrator' : 'Pengguna'}</p>
            </div>
            <Badge className={`text-[10px] px-1.5 py-0 h-5 ${user?.role === 'ADMIN' ? 'bg-forest text-white' : 'bg-wood text-white'}`}>
              {user?.role === 'ADMIN' ? 'Admin' : 'User'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="h-9 w-9 text-bark hover:text-forest hover:bg-forest/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

// ===================== PDF UPLOAD DIALOG =====================
function PdfUploadDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fetchPdfs = useAppStore((s) => s.fetchPdfs)
  const { toast } = useToast()

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/pdfs', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: `PDF "${data.pdf.originalName}" berhasil diupload` })
        setOpen(false)
        setFile(null)
        fetchPdfs()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengupload PDF', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload File PDF
          </DialogTitle>
          <DialogDescription>Pilih file PDF yang ingin diupload ke sistem</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('pdf-input')?.click()}
          >
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Klik untuk memilih file PDF</p>
                <p className="text-sm text-muted-foreground">atau drag and drop file di sini</p>
              </div>
            )}
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setFile(null) }}>
            Batal
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Mengupload...
              </span>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===================== PDF MANAGEMENT TAB =====================
function PdfManagement() {
  const pdfs = useAppStore((s) => s.pdfs)
  const fetchPdfs = useAppStore((s) => s.fetchPdfs)
  const setViewingPdf = useAppStore((s) => s.setViewingPdf)
  const { toast } = useToast()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus PDF "${name}"? Semua assignment terkait juga akan dihapus.`)) return
    try {
      const res = await fetch(`/api/pdfs?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: data.message })
        fetchPdfs()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus PDF', variant: 'destructive' })
    }
  }

  const handleViewAll = (pdf: { id: string; originalName: string; totalPages: number }) => {
    const allPages = Array.from({ length: pdf.totalPages }, (_, i) => i + 1)
    setViewingPdf({ pdfId: pdf.id, pageNumbers: allPages, originalName: pdf.originalName })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daftar Dokumen PDF</h3>
          <p className="text-sm text-muted-foreground">{pdfs.length} dokumen terdaftar</p>
        </div>
        <PdfUploadDialog />
      </div>
      <Separator />
      {pdfs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Belum ada dokumen PDF</p>
          <p className="text-sm">Upload PDF pertama Anda untuk memulai</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pdfs.map((pdf) => (
            <Card key={pdf.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-forest/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-forest" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium truncate" title={pdf.originalName}>
                        {pdf.originalName}
                      </CardTitle>
                      <CardDescription className="text-xs">{pdf.totalPages} halaman</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1 mb-3">
                  <Badge variant="outline" className="text-[10px]">
                    {pdf.assignments?.length || 0} assignment
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleViewAll(pdf)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Lihat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(pdf.id, pdf.originalName)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== USER MANAGEMENT TAB =====================
function UserManagement() {
  const users = useAppStore((s) => s.users)
  const fetchUsers = useAppStore((s) => s.fetchUsers)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'USER' })
  const [editForm, setEditForm] = useState({ name: '', role: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: `User "${data.user.name}" berhasil dibuat` })
        setOpen(false)
        setForm({ username: '', password: '', name: '', role: 'USER' })
        fetchUsers()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal membuat user', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    setSubmitting(true)
    try {
      const body: Record<string, string> = { id: editUser.id, name: editForm.name, role: editForm.role }
      if (editForm.password) body.password = editForm.password
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: `User "${data.user.name}" berhasil diperbarui` })
        setEditOpen(false)
        setEditUser(null)
        fetchUsers()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal memperbarui user', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Hapus user "${user.name}"? Semua assignment terkait juga akan dihapus.`)) return
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: data.message })
        fetchUsers()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus user', variant: 'destructive' })
    }
  }

  const openEdit = (user: UserRow) => {
    setEditUser(user)
    setEditForm({ name: user.name, role: user.role, password: '' })
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Manajemen User</h3>
          <p className="text-sm text-muted-foreground">{users.length} user terdaftar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tambah User Baru
              </DialogTitle>
              <DialogDescription>Buat akun baru untuk mengakses dokumen PDF</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Masukkan username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Masukkan password"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Buat User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Separator />

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>Perbarui informasi user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password Baru (kosongkan jika tidak ingin mengubah)</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Password baru"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Belum ada user</p>
          <p className="text-sm">Tambahkan user baru untuk memulai</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="truncate max-w-[120px]">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? 'Admin' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                    {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ===================== ASSIGNMENT MANAGEMENT TAB =====================
function AssignmentManagement() {
  const pdfs = useAppStore((s) => s.pdfs)
  const users = useAppStore((s) => s.users)
  const assignments = useAppStore((s) => s.assignments)
  const fetchAssignments = useAppStore((s) => s.fetchAssignments)
  const fetchUsers = useAppStore((s) => s.fetchUsers)
  const fetchPdfs = useAppStore((s) => s.fetchPdfs)
  const setViewingPdf = useAppStore((s) => s.setViewingPdf)
  const [open, setOpen] = useState(false)
  const [selectedPdfId, setSelectedPdfId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const selectedPdf = pdfs.find((p) => p.id === selectedPdfId)

  const handleTogglePage = (page: number) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    )
  }

  const handleSelectAll = () => {
    if (!selectedPdf) return
    if (selectedPages.length === selectedPdf.totalPages) {
      setSelectedPages([])
    } else {
      setSelectedPages(Array.from({ length: selectedPdf.totalPages }, (_, i) => i + 1))
    }
  }

  const handleCreate = async () => {
    if (!selectedPdfId || !selectedUserId || selectedPages.length === 0) {
      toast({ title: 'Perhatian', description: 'Pilih user, PDF, dan minimal 1 halaman', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, pdfId: selectedPdfId, pageNumbers: selectedPages }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'Assignment berhasil dibuat/diperbarui' })
        setOpen(false)
        setSelectedPdfId('')
        setSelectedUserId('')
        setSelectedPages([])
        fetchAssignments()
        fetchPdfs()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal membuat assignment', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus assignment ini?')) return
    try {
      const res = await fetch(`/api/assignments?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Berhasil', description: data.message })
        fetchAssignments()
        fetchPdfs()
      } else {
        toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus assignment', variant: 'destructive' })
    }
  }

  const regularUsers = users.filter((u) => u.role !== 'ADMIN')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assign Halaman PDF</h3>
          <p className="text-sm text-muted-foreground">Bagikan halaman spesifik dari PDF ke user tertentu</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { fetchUsers(); fetchPdfs() }}>
              <Plus className="h-4 w-4" />
              Buat Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Buat Assignment Baru
              </DialogTitle>
              <DialogDescription>Pilih user dan halaman PDF yang akan diassign</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pilih User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regularUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pilih Dokumen PDF</Label>
                <Select value={selectedPdfId} onValueChange={(v) => { setSelectedPdfId(v); setSelectedPages([]) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih PDF..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pdfs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.originalName} ({p.totalPages} hal)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPdf && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Pilih Halaman</Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSelectAll}>
                      {selectedPages.length === selectedPdf.totalPages ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </Button>
                  </div>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1.5">
                      {Array.from({ length: selectedPdf.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => handleTogglePage(page)}
                          className={`h-8 w-full rounded text-xs font-medium transition-colors ${
                            selectedPages.includes(page)
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPages.length} dari {selectedPdf.totalPages} halaman dipilih
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={submitting || !selectedUserId || !selectedPdfId || selectedPages.length === 0}>
                {submitting ? 'Menyimpan...' : 'Simpan Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Separator />
      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Belum ada assignment</p>
          <p className="text-sm">Buat assignment pertama untuk membagikan halaman PDF ke user</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Dokumen PDF</TableHead>
                <TableHead>Halaman</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{a.user?.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{a.user?.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-forest shrink-0" />
                      <span className="text-sm truncate max-w-[150px]">{a.pdf?.originalName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {a.pageNumbers.length <= 5 ? (
                        a.pageNumbers.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5">
                            {p}
                          </Badge>
                        ))
                      ) : (
                        <>
                          {a.pageNumbers.slice(0, 3).map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5">
                              {p}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                            +{a.pageNumbers.length - 3}
                          </Badge>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingPdf({
                          pdfId: a.pdfId,
                          pageNumbers: a.pageNumbers,
                          originalName: a.pdf?.originalName || 'PDF',
                        })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ===================== PDF VIEWER =====================
function PdfViewer() {
  const viewingPdf = useAppStore((s) => s.viewingPdf)
  const setViewingPdf = useAppStore((s) => s.setViewingPdf)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPdf = useCallback(async () => {
    if (!viewingPdf) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pdfs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: viewingPdf.pdfId, pageNumbers: viewingPdf.pageNumbers }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Gagal memuat PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch {
      setError('Gagal memuat PDF')
    } finally {
      setLoading(false)
    }
  }, [viewingPdf])

  useEffect(() => {
    if (viewingPdf) {
      loadPdf()
    } else {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
      setError('')
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [viewingPdf, loadPdf])

  if (!viewingPdf) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-forest/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-forest" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{viewingPdf.originalName}</CardTitle>
                <CardDescription className="text-xs">
                  {viewingPdf.pageNumbers.length} halaman ditampilkan
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pdfUrl && (
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <a href={pdfUrl} download={`${viewingPdf.originalName.replace('.pdf', '')}_assigned.pdf`}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setViewingPdf(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                <p className="mt-3 text-sm text-muted-foreground">Memuat PDF...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-destructive">
                <XCircle className="h-10 w-10 mx-auto mb-2" />
                <p className="font-medium">Gagal memuat PDF</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Viewer" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== ADMIN DASHBOARD =====================
function AdminDashboard() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const fetchPdfs = useAppStore((s) => s.fetchPdfs)
  const fetchUsers = useAppStore((s) => s.fetchUsers)
  const fetchAssignments = useAppStore((s) => s.fetchAssignments)
  const pdfs = useAppStore((s) => s.pdfs)
  const users = useAppStore((s) => s.users)
  const assignments = useAppStore((s) => s.assignments)

  useEffect(() => {
    fetchPdfs()
    fetchUsers()
    fetchAssignments()
  }, [fetchPdfs, fetchUsers, fetchAssignments])

  const stats = [
    { label: 'Total PDF', value: pdfs.length, icon: FileText, color: 'text-forest', bg: 'bg-forest/10' },
    { label: 'Total User', value: users.filter((u) => u.role !== 'ADMIN').length, icon: Users, color: 'text-leaf', bg: 'bg-leaf/10' },
    { label: 'Assignment', value: assignments.length, icon: Shield, color: 'text-wood', bg: 'bg-wood/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pdfs" className="gap-1.5">
            <FileText className="h-4 w-4 hidden sm:block" />
            Dokumen PDF
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4 hidden sm:block" />
            User
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5">
            <Shield className="h-4 w-4 hidden sm:block" />
            Assignment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pdfs" className="mt-4">
          <PdfManagement />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <AssignmentManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===================== USER DASHBOARD =====================
function UserDashboard() {
  const myPages = useAppStore((s) => s.myPages)
  const fetchMyPages = useAppStore((s) => s.fetchMyPages)
  const setViewingPdf = useAppStore((s) => s.setViewingPdf)
  const [expandedPdf, setExpandedPdf] = useState<string | null>(null)

  useEffect(() => {
    fetchMyPages()
  }, [fetchMyPages])

  const handleViewPdf = (item: { id: string; originalName: string; assignedPages: number[] }) => {
    setViewingPdf({ pdfId: item.id, pageNumbers: item.assignedPages, originalName: item.originalName })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Dokumen Saya
        </h3>
        <p className="text-sm text-muted-foreground">Halaman PDF yang telah diassign kepada Anda</p>
      </div>
      <Separator />
      {myPages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Belum ada dokumen yang diassign</p>
          <p className="text-sm mt-1">Admin belum membagikan halaman PDF kepada Anda</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myPages.map((item) => (
            <Card key={item.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-forest/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-forest" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-medium truncate" title={item.originalName}>
                      {item.originalName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {item.assignedPages.length} dari {item.totalPages} halaman
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Page numbers preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Halaman yang bisa diakses:</p>
                  <div className="flex flex-wrap gap-1">
                    {item.assignedPages.length <= 10 ? (
                      item.assignedPages.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <>
                        {item.assignedPages.slice(0, 7).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                            {p}
                          </Badge>
                        ))}
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-muted"
                          onClick={() => setExpandedPdf(expandedPdf === item.id ? null : item.id)}
                        >
                          +{item.assignedPages.length - 7} lagi
                        </Badge>
                      </>
                    )}
                  </div>
                  {expandedPdf === item.id && item.assignedPages.length > 10 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.assignedPages.slice(7).map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button className="w-full gap-2" size="sm" onClick={() => handleViewPdf(item)}>
                  <Eye className="h-4 w-4" />
                  Lihat Dokumen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== FOOTER =====================
function Footer() {
  return (
    <footer className="mt-auto border-t border-sand/30 bg-gradient-to-r from-parchment to-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <p className="text-xs text-wood text-center">
          PDF Manager — Kelola akses dokumen PDF dengan aman dan efisien
        </p>
      </div>
    </footer>
  )
}

// ===================== MAIN PAGE =====================
export default function HomePage() {
  const user = useAppStore((s) => s.user)
  const isLoading = useAppStore((s) => s.isLoading)
  const checkAuth = useAppStore((s) => s.checkAuth)

  useEffect(() => {
    // Seed admin on first load - await agar login tidak mendahului seed
    let cancelled = false
    const init = async () => {
      try {
        await fetch('/api/seed', { method: 'POST' })
      } catch (e) {
        console.error('Seed failed on load:', e)
      }
      if (!cancelled) {
        checkAuth()
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="h-10 w-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          <p className="mt-4 text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-cream via-white to-parchment">
      <AppHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {user.role === 'ADMIN' ? <AdminDashboard /> : <UserDashboard />}
      </main>
      <Footer />
      <PdfViewer />
    </div>
  )
}
