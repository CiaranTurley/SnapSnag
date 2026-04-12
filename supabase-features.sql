-- ─── Run this in your Supabase SQL editor ────────────────────────────────────
-- Go to: supabase.com → your project → SQL Editor → paste this → Run

-- ── Warranty countdown ───────────────────────────────────────────────────────
alter table inspections
  add column if not exists handover_date         date,
  add column if not exists warranty_expires_at   timestamptz,
  add column if not exists warranty_reminder_sent boolean default false;

-- ── Real-time view share token ───────────────────────────────────────────────
alter table inspections
  add column if not exists view_token            text unique,
  add column if not exists view_token_expires_at timestamptz;

-- ── Users: referral programme + credit balance + notification prefs ──────────
alter table users
  add column if not exists referral_code      text unique,
  add column if not exists credit_balance     integer not null default 0,
  add column if not exists referred_by        text,
  add column if not exists first_paid_done    boolean default false,
  add column if not exists warranty_emails    boolean not null default true,
  add column if not exists marketing_emails   boolean not null default true;

-- ── Gift cards ────────────────────────────────────────────────────────────────
create table if not exists gift_cards (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  amount_cents        integer not null,
  currency            text not null default 'EUR',
  purchased_by_email  text,
  redeemed_by         uuid references auth.users(id),
  redeemed_at         timestamptz,
  stripe_session_id   text,
  created_at          timestamptz not null default now()
);
create index if not exists gift_cards_code_idx on gift_cards(code);

-- ── Defect database (anonymised analytics) ───────────────────────────────────
create table if not exists defect_database (
  id               uuid primary key default gen_random_uuid(),
  country          text not null,
  property_type    text,
  region           text,
  room             text not null,
  item_description text not null,
  severity         text,
  created_at       timestamptz not null default now()
);
create index if not exists defect_db_country_idx  on defect_database(country);
create index if not exists defect_db_room_idx     on defect_database(room);
create index if not exists defect_db_severity_idx on defect_database(severity);

-- No RLS on defect_database — service role writes, no public reads
