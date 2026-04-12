import { createClient } from '@supabase/supabase-js'

// ─── Admin client — bypasses RLS. Server-side only. Never import in client components. ──
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
