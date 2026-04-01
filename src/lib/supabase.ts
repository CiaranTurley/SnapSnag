import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Browser client (use in React client components) ─────────────────────────
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// ─── Simple singleton for client components ───────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ─── Admin client — only use in API routes, never in browser ─────────────────
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
