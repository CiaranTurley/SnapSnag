import { NextRequest, NextResponse } from 'next/server'
import { upsertContact } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, name, userId, country } = await req.json()
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    await upsertContact(email, { name, userId, country })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // non-fatal
  }
}
