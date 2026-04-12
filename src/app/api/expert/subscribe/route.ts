import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const companyName  = formData.get('company_name') as string
  const contactEmail = formData.get('contact_email') as string
  const phone        = formData.get('phone') as string | null
  const website      = formData.get('website') as string | null
  const plan         = formData.get('plan') as string // 'monthly' | 'annual'
  const logoFile     = formData.get('logo') as File | null

  if (!companyName || !contactEmail) {
    return NextResponse.json({ error: 'company_name and contact_email are required' }, { status: 400 })
  }

  const priceId = plan === 'annual'
    ? process.env.STRIPE_EXPERT_ANNUAL_PRICE_ID!
    : process.env.STRIPE_EXPERT_MONTHLY_PRICE_ID!

  // Upload logo if provided
  let companyLogoUrl: string | null = null
  if (logoFile && logoFile.size > 0) {
    const admin = createSupabaseAdminClient()
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
      companyLogoUrl = publicUrl
    }
  }

  // Upsert expert_subscriptions row (trial)
  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('expert_subscriptions')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let stripeCustomerId: string

  if (existing?.stripe_customer_id) {
    stripeCustomerId = existing.stripe_customer_id
  } else {
    const customer = await stripe.customers.create({
      email: contactEmail,
      metadata: { supabase_user_id: user.id },
    })
    stripeCustomerId = customer.id
  }

  if (existing) {
    await admin
      .from('expert_subscriptions')
      .update({
        company_name: companyName,
        company_logo_url: companyLogoUrl ?? existing.stripe_customer_id ? undefined : null,
        contact_email: contactEmail,
        phone,
        website,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await admin.from('expert_subscriptions').insert({
      user_id: user.id,
      company_name: companyName,
      company_logo_url: companyLogoUrl,
      contact_email: contactEmail,
      phone,
      website,
      stripe_customer_id: stripeCustomerId,
      status: 'trial',
      trial_ends_at: trialEnd.toISOString(),
    })
  }

  // Create Stripe Checkout session for subscription
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { supabase_user_id: user.id },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/expert/dashboard?subscribed=1`,
    cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/expert?cancelled=1`,
    metadata: { supabase_user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
