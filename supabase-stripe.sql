-- ─── Run this in your Supabase SQL editor ────────────────────────────────────
-- Go to: supabase.com → your project → SQL Editor → paste this → Run

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS stripe_session_id text;
