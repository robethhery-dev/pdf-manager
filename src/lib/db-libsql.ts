import { createClient, type Client } from '@libsql/client'
import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const getJwtSecret = () => {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'pdf-manager-secret-key-change-in-production'
  )
}

export interface AuthPayload {
  userId: string
  username: string
  role: string
  name: string
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(getJwtSecret())
}

// Inisialisasi libSQL client — env vars dibaca saat runtime, bukan build time.
let _client: Client | null = null

export function getDb(): Client {
  if (_client) return _client
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL belum diset di server')
  }
  _client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  })
  return _client
}

// Helper: format row dari libSQL (yang return values sebagai bigint/buffer) ke plain JS
export function row(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'bigint') {
      out[k] = Number(v)
    } else if (v instanceof Uint8Array) {
      out[k] = Buffer.from(v)
    } else {
      out[k] = v
    }
  }
  return out
}
