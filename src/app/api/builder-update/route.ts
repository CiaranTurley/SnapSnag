import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { sendBuilderUpdateEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const {
      verificationCode,
      checklistItemId,
      status,
      builderNote,
      disputeReason,
      builderPhotoUrl,
    } = await req.json()

    if (!verificationCode || !checklistItemId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validStatuses = ['outstanding', 'fixed', 'in_progress', 'disputed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseAdminClient() as any

    // Validate verification code and get inspection
    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .select('id, address, user_id')
      .eq('verification_code', verificationCode.toUpperCase())
      .single()

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }

    // Verify the checklist item belongs to this inspection
    const { data: checklistItem, error: itemError } = await supabase
      .from('checklist_items')
      .select('id, item_description, room')
      .eq('id', checklistItemId)
      .eq('inspection_id', inspection.id)
      .single()

    if (itemError || !checklistItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Get previous status for notification
    const { data: existing } = await supabase
      .from('builder_portal_items')
      .select('status')
      .eq('checklist_item_id', checklistItemId)
      .single()

    const previousStatus = existing?.status ?? 'outstanding'

    // Upsert builder portal item
    const { error: upsertError } = await supabase
      .from('builder_portal_items')
      .upsert(
        {
          inspection_id: inspection.id,
          checklist_item_id: checklistItemId,
          status,
          builder_note: builderNote ?? null,
          dispute_reason: disputeReason ?? null,
          builder_photo_url: builderPhotoUrl ?? null,
          updated_at: new Date().toISOString(),
          // Reset buyer_accepted when builder updates
          buyer_accepted: null,
        },
        { onConflict: 'checklist_item_id' },
      )

    if (upsertError) {
      console.error('Builder portal upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    // Get buyer email + name for notification
    const { data: buyerProfile } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', inspection.user_id)
      .single()

    // Send Loops transactional email (fire and forget)
    if (buyerProfile?.email) {
      const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/inspect/${inspection.id}/report`
      sendBuilderUpdateEmail({
        email: buyerProfile.email,
        name: buyerProfile.name ?? '',
        address: inspection.address ?? 'your property',
        room: checklistItem.room,
        itemDescription: checklistItem.item_description,
        previousStatus,
        newStatus: status,
        builderNote: builderNote ?? undefined,
        reportUrl,
      }).catch(err => console.error('Builder update email failed (non-fatal):', err))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Builder update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
