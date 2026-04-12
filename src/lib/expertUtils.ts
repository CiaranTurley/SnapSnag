import { createSupabaseAdminClient } from './supabase-admin'

export interface ExpertSubscription {
  id: string
  company_name: string
  company_logo_url: string | null
  contact_email: string
  phone: string | null
  website: string | null
  status: 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired'
  trial_ends_at: string | null
  current_period_end: string | null
}

export async function getExpertSubscription(userId: string): Promise<ExpertSubscription | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('expert_subscriptions')
    .select('id, company_name, company_logo_url, contact_email, phone, website, status, trial_ends_at, current_period_end')
    .eq('user_id', userId)
    .in('status', ['trial', 'active'])
    .maybeSingle()
  return data as ExpertSubscription | null
}

export function isActiveExpert(sub: ExpertSubscription | null): boolean {
  return sub !== null
}
