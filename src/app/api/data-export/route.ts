import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const userId = user.id

  const [profile, inspections, expertSub] = await Promise.all([
    admin.from('users').select('name, email, referral_code, credit_balance, created_at').eq('id', userId).single(),
    admin.from('inspections').select('*, checklist_items(*)').eq('user_id', userId),
    admin.from('expert_subscriptions').select('status, created_at, current_period_end').eq('user_id', userId).single(),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    inspections: inspections.data ?? [],
    expert_subscription: expertSub.data ?? null,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="snapsnag-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
