import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { sendDataDeletionEmail } from '@/lib/email'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(_req: NextRequest) {
  // Auth check — must be logged in
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const userId = user.id
  const userEmail = user.email ?? ''

  try {
    // 1. Get user profile for name + Stripe customer ID
    const { data: profile } = await admin
      .from('users')
      .select('name, stripe_customer_id')
      .eq('id', userId)
      .single()

    // 2. Get all inspection IDs for this user
    const { data: inspections } = await admin
      .from('inspections')
      .select('id')
      .eq('user_id', userId)

    const inspectionIds = (inspections ?? []).map(i => i.id)

    // 3. Delete Supabase Storage files for each inspection
    if (inspectionIds.length > 0) {
      // Photos stored under user ID folder
      const { data: files } = await admin.storage
        .from('inspection-photos')
        .list(userId, { limit: 1000 })

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`)
        await admin.storage.from('inspection-photos').remove(filePaths)
      }

      // Company logos
      const { data: logoFiles } = await admin.storage
        .from('company-logos')
        .list(userId, { limit: 100 })

      if (logoFiles && logoFiles.length > 0) {
        const logoPaths = logoFiles.map(f => `${userId}/${f.name}`)
        await admin.storage.from('company-logos').remove(logoPaths)
      }

      // 4. Delete checklist_items for all inspections
      await admin
        .from('checklist_items')
        .delete()
        .in('inspection_id', inspectionIds)

      // 5. Delete builder_portal_items
      await admin
        .from('builder_portal_items')
        .delete()
        .in('inspection_id', inspectionIds)
    }

    // 6. Delete all inspections
    await admin
      .from('inspections')
      .delete()
      .eq('user_id', userId)

    // 7. Delete support tickets
    await admin
      .from('support_tickets')
      .delete()
      .eq('user_id', userId)

    // 8. Delete expert subscription
    await admin
      .from('expert_subscriptions')
      .delete()
      .eq('user_id', userId)

    // 9. Delete gift cards
    await admin
      .from('gift_cards')
      .delete()
      .eq('purchased_by', userId)

    // 10. Anonymise Stripe customer (remove PII, keep payment records)
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.update(profile.stripe_customer_id, {
          name: 'Deleted User',
          email: `deleted-${userId}@snapsnag-deleted.invalid`,
          metadata: { deleted: 'true', deleted_at: new Date().toISOString() },
        })
      } catch {
        // Non-fatal — log but don't block deletion
        console.error('[data-deletion] Stripe customer anonymisation failed (non-fatal)')
      }
    }

    // 11. Send confirmation email before deleting the user record
    if (userEmail) {
      await sendDataDeletionEmail({
        email: userEmail,
        name: profile?.name ?? '',
      }).catch(() => {})
    }

    // 12. Delete the user record from our users table
    await admin
      .from('users')
      .delete()
      .eq('id', userId)

    // 13. Delete the Supabase auth user (must be last)
    await admin.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[data-deletion] Error:', err)
    return NextResponse.json({ error: 'Deletion failed — please contact hello@snapsnagapp.com' }, { status: 500 })
  }
}
