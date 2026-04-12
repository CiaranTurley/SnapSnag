import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('expert_subscriptions')
    .select('id, company_name, company_logo_url, contact_email, phone, website, status, trial_ends_at, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ subscription: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()

  // Check existing
  const { data: existing } = await admin
    .from('expert_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'No expert subscription found' }, { status: 404 })

  const formData = await req.formData()
  const companyName  = formData.get('company_name') as string | null
  const contactEmail = formData.get('contact_email') as string | null
  const phone        = formData.get('phone') as string | null
  const website      = formData.get('website') as string | null
  const logoFile     = formData.get('logo') as File | null

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (companyName)  updates.company_name  = companyName
  if (contactEmail) updates.contact_email = contactEmail
  if (phone !== null)   updates.phone   = phone
  if (website !== null) updates.website = website

  if (logoFile && logoFile.size > 0) {
    const ext   = logoFile.name.split('.').pop() ?? 'png'
    const path  = `${user.id}/${Date.now()}.${ext}`
    const bytes = await logoFile.arrayBuffer()

    const { error: uploadError } = await admin.storage
      .from('company-logos')
      .upload(path, bytes, { contentType: logoFile.type, upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = admin.storage
        .from('company-logos')
        .getPublicUrl(path)
      updates.company_logo_url = publicUrl
    }
  }

  await admin
    .from('expert_subscriptions')
    .update(updates)
    .eq('id', existing.id)

  return NextResponse.json({ success: true })
}
