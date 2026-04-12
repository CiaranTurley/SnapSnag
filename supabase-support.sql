-- ─── Run this in your Supabase SQL editor ────────────────────────────────────
-- Go to: supabase.com → your project → SQL Editor → paste this → Run

-- Support tickets table
create table if not exists support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  user_email    text,
  inspection_id uuid references inspections(id) on delete set null,
  category      text not null default 'question'
                  check (category in ('technical', 'payment', 'complaint', 'question', 'legal', 'fraud')),
  messages      jsonb not null default '[]',
  status        text not null default 'open'
                  check (status in ('open', 'resolved', 'escalated')),
  owner_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for quick lookup by user and status
create index if not exists support_tickets_user_id_idx   on support_tickets(user_id);
create index if not exists support_tickets_status_idx    on support_tickets(status);
create index if not exists support_tickets_category_idx  on support_tickets(category);
create index if not exists support_tickets_created_idx   on support_tickets(created_at desc);

-- RLS: users can only read their own tickets; service role can do everything
alter table support_tickets enable row level security;

create policy "Users can read own tickets"
  on support_tickets for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS — used by API routes
