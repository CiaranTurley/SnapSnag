-- ─── Run this in your Supabase SQL editor ────────────────────────────────────
-- Go to: supabase.com → your project → SQL Editor → paste this → Run

-- Expert subscriptions table
create table if not exists expert_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  company_name            text not null,
  company_logo_url        text,
  contact_email           text not null,
  phone                   text,
  website                 text,
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  status                  text not null default 'trial'
                            check (status in ('trial', 'active', 'cancelled', 'past_due', 'expired')),
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists expert_subscriptions_user_id_idx  on expert_subscriptions(user_id);
create index if not exists expert_subscriptions_status_idx   on expert_subscriptions(status);
create index if not exists expert_subscriptions_stripe_idx   on expert_subscriptions(stripe_subscription_id);

-- RLS: users can read their own subscription
alter table expert_subscriptions enable row level security;

create policy "Users can read own expert subscription"
  on expert_subscriptions for select
  using (auth.uid() = user_id);

-- Add share token to inspections (for client-sharing links)
alter table inspections
  add column if not exists share_token      text unique,
  add column if not exists share_token_created_at timestamptz,
  add column if not exists is_expert_inspection boolean default false;

-- Storage bucket: company logos
-- Run in Supabase dashboard: Storage → New bucket → "company-logos" (public)
