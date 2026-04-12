import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inspection_id } = await req.json() as { inspection_id: string }
  if (!inspection_id) return NextResponse.json({ error: 'inspection_id required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: inspection } = await admin
    .from('inspections')
    .select('id, user_id, view_token, view_token_expires_at, status')
    .eq('id', inspection_id)
    .eq('user_id', user.id)
    .single()

  if (!inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

  // Reuse existing token if still valid
  if (inspection.view_token && inspection.view_token_expires_at) {
    const expires = new Date(inspection.view_token_expires_at)
    if (expires > new Date()) {
      return NextResponse.json({
        token: inspection.view_token,
        viewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/view/${inspection.view_token}`,
      })
    }
  }

  // Generate new token — expires 7 days after completion or 30 days from now
  const token   = randomBytes(16).toString('hex')
  const expires = new Date()
  expires.setDate(expires.getDate() + (inspection.status === 'paid' || inspection.status === 'completed' ? 7 : 30))

  await admin
    .from('inspections')
    .update({ view_token: token, view_token_expires_at: expires.toISOString() })
    .eq('id', inspection_id)

  return NextResponse.json({
    token,
    viewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/view/${token}`,
  })
}
