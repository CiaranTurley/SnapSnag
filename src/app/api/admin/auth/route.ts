import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
  }

  const { password } = await req.json()

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('ss_admin', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('ss_admin')
  return res
}
