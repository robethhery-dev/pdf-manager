import { create } from 'zustand'

export interface UserInfo {
  id: string
  username: string
  name: string
  role: string
}

export interface PdfInfo {
  id: string
  originalName: string
  totalPages: number
  filePath?: string
  createdAt: string
  assignments?: AssignmentInfo[]
}

export interface AssignmentInfo {
  id: string
  userId: string
  pdfId: string
  pageNumbers: number[]
  user?: { id: string; username: string; name: string }
  pdf?: { id: string; originalName: string; totalPages: number }
}

export interface UserRow {
  id: string
  username: string
  name: string
  role: string
  createdAt: string
}

interface AppState {
  user: UserInfo | null
  isLoading: boolean
  activeTab: string
  pdfs: PdfInfo[]
  users: UserRow[]
  assignments: AssignmentInfo[]
  myPages: (PdfInfo & { assignedPages: number[] })[]
  viewingPdf: { pdfId: string; pageNumbers: number[]; originalName: string } | null

  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  setActiveTab: (tab: string) => void
  setPdfs: (pdfs: PdfInfo[]) => void
  setUsers: (users: UserRow[]) => void
  setAssignments: (assignments: AssignmentInfo[]) => void
  setMyPages: (pages: (PdfInfo & { assignedPages: number[] })[]) => void
  setViewingPdf: (viewing: { pdfId: string; pageNumbers: number[]; originalName: string } | null) => void

  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  fetchPdfs: () => Promise<void>
  fetchUsers: () => Promise<void>
  fetchAssignments: () => Promise<void>
  fetchMyPages: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isLoading: true,
  activeTab: 'pdfs',
  pdfs: [],
  users: [],
  assignments: [],
  myPages: [],
  viewingPdf: null,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPdfs: (pdfs) => set({ pdfs }),
  setUsers: (users) => set({ users }),
  setAssignments: (assignments) => set({ assignments }),
  setMyPages: (myPages) => set({ myPages }),
  setViewingPdf: (viewingPdf) => set({ viewingPdf }),

  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok) {
        set({ user: data.user })
        return true
      }
      return false
    } catch {
      return false
    }
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, pdfs: [], users: [], assignments: [], myPages: [], viewingPdf: null, activeTab: 'pdfs' })
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user })
      } else {
        set({ user: null })
      }
    } catch {
      set({ user: null })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPdfs: async () => {
    try {
      const res = await fetch('/api/pdfs')
      if (res.ok) {
        const data = await res.json()
        set({ pdfs: data.pdfs })
      }
    } catch (error) {
      console.error('Fetch PDFs error:', error)
    }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        set({ users: data.users })
      }
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  },

  fetchAssignments: async () => {
    try {
      const res = await fetch('/api/assignments')
      if (res.ok) {
        const data = await res.json()
        set({ assignments: data.assignments })
      }
    } catch (error) {
      console.error('Fetch assignments error:', error)
    }
  },

  fetchMyPages: async () => {
    try {
      const res = await fetch('/api/my-pages')
      if (res.ok) {
        const data = await res.json()
        set({ myPages: data.pages })
      }
    } catch (error) {
      console.error('Fetch my pages error:', error)
    }
  },
}))
