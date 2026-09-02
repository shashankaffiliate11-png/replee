-- NoticeDesk initial schema
-- Run via: npx supabase db push   (or paste into the Supabase SQL editor)

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── profiles ─────────────────────────────────────────────────────────────
-- One row per signed-in user, created on first login (see Onboarding.tsx).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  firm_name text,
  ca_membership_no text,
  phone text,
  plan text not null default 'free_trial'
    check (plan in ('free_trial', 'starter', 'professional')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ── notices ──────────────────────────────────────────────────────────────
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_name text not null,
  notice_type text not null,
  notice_reference_no text,
  notice_section text,
  original_notice_text text not null,
  ai_draft_response text,
  final_response text,
  status text not null default 'drafted'
    check (status in ('drafted', 'edited', 'finalized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_user_id_idx on public.notices (user_id, created_at desc);

alter table public.notices enable row level security;

create policy "notices_select_own"
  on public.notices for select
  using (auth.uid() = user_id);

create policy "notices_insert_own"
  on public.notices for insert
  with check (auth.uid() = user_id);

create policy "notices_update_own"
  on public.notices for update
  using (auth.uid() = user_id);

create policy "notices_delete_own"
  on public.notices for delete
  using (auth.uid() = user_id);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

-- ── usage_counters ───────────────────────────────────────────────────────
-- One row per user per calendar month, incremented by the draft-notice
-- edge function. Used to enforce plan limits.
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_month date not null, -- always the 1st of the month, e.g. 2026-09-01
  notices_used int not null default 0,
  primary key (user_id, period_month)
);

alter table public.usage_counters enable row level security;

create policy "usage_select_own"
  on public.usage_counters for select
  using (auth.uid() = user_id);

-- Inserts/updates to usage_counters happen only from the edge function
-- using the service role key, which bypasses RLS by design — no client
-- write policy is defined on purpose, so a signed-in user cannot inflate
-- their own remaining quota.

-- ── subscriptions ────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free_trial', 'starter', 'professional')),
  razorpay_subscription_id text,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Subscription rows are written only by the razorpay-webhook edge function
-- (service role), never directly by the client.
