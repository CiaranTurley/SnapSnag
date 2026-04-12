import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getExpertSubscription } from '@/lib/expertUtils'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await getExpertSubscription(user.id)
  if (!sub) return NextResponse.json({ error: 'Expert subscription required' }, { status: 403 })

  const { inspection_id } = await req.json() as { inspection_id: string }
  if (!inspection_id) return NextResponse.json({ error: 'inspection_id required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  // Verify inspection belongs to this user
  const { data: inspection } = await admin
    .from('inspections')
    .select('id, user_id, share_token')
    .eq('id', inspection_id)
    .eq('user_id', user.id)
    .single()

  if (!inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

  // Reuse existing token or generate new one
  let token = inspection.share_token
  if (!token) {
    token = randomBytes(16).toString('hex')
    await admin
      .from('inspections')
      .update({
        share_token: token,
        share_token_created_at: new Date().toISOString(),
        is_expert_inspection: true,
      })
      .eq('id', inspection_id)
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/share/${token}`
  return NextResponse.json({ token, shareUrl })
}
