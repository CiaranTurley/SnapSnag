import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { checklistItemId, accepted, feedback } = await req.json()

    if (!checklistItemId || typeof accepted !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the buyer is authenticated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serverSupabase = createSupabaseServerClient() as any
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseAdminClient() as any

    // Verify the buyer owns the inspection this item belongs to
    const { data: checklistItem } = await supabase
      .from('checklist_items')
      .select('id, inspection_id, item_description, room')
      .eq('id', checklistItemId)
      .single()

    if (!checklistItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const { data: inspection } = await supabase
      .from('inspections')
      .select('id, user_id, verification_code, address')
      .eq('id', checklistItem.inspection_id)
      .single()

    if (!inspection || inspection.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Update buyer_accepted on the builder_portal_item
    const { error: updateError } = await supabase
      .from('builder_portal_items')
      .update({
        buyer_accepted: accepted,
        buyer_feedback: feedback ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('checklist_item_id', checklistItemId)

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // If buyer is not satisfied, notify builder (log for now — same email system)
    if (!accepted) {
      console.log(
        `[buyer-response] Buyer not satisfied with fix for item "${checklistItem.item_description}" ` +
        `on inspection ${inspection.id} (code: ${inspection.verification_code})`,
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Buyer response error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
