-- NoticeDesk: Admin Portal
--
-- 1. admin_users — who can access the Admin Portal, and at what role.
--    Roles: 'Reader' (view only), 'Editor' (can edit subscribers, cannot
--    manage other admin users), 'Admin' (full access — add/remove admin
--    users, change roles, edit anything, no restrictions).
--
--    Membership is keyed by email, not user_id, so someone can be granted
--    access before they've ever signed in — the backend checks the
--    signed-in Supabase user's email against this table on every admin
--    request (see api/index.js's requireAdminRole).
--
-- 2. profiles gains billing_cycle + subscription_start_date, so a
--    subscriber's plan expiry can be computed the same way the Admin
--    Portal design specifies: +30 days from the start date for monthly,
--    +365 days for yearly. This is what lets an admin manually record an
--    offline/bank-transfer payment (e.g. a CA who paid a full year via
--    UPI) with a correct expiry, the same way profiles.plan is already
--    hand-edited today for early customers.
--
-- Run this in the Supabase SQL Editor after all previous migrations.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('Reader', 'Editor', 'Admin')),
  created_at timestamptz not null default now()
);

-- Seed the two initial admins so the portal isn't locked out of itself on
-- first deploy. Emails are stored lowercased; the backend lowercases the
-- signed-in user's email before comparing, so casing never matters.
insert into public.admin_users (email, role)
values
  ('shashank.bawane@gmail.com', 'Admin'),
  ('shashankaffiliate11@gmail.com', 'Admin')
on conflict (email) do nothing;

alter table public.admin_users enable row level security;

-- Anyone who is themselves an admin-panel member (any role) can see the
-- full roster — matches the Admin Portal's "team" view, where even a
-- Reader can see who has access. Writes are restricted separately, at the
-- API layer (service role), since role changes need Admin-only enforcement
-- that's simpler to reason about in one place (api/index.js) than spread
-- across RLS policies referencing this same table recursively.
create policy "admin_users_select_if_member"
  on public.admin_users for select
  using (
    lower(auth.jwt() ->> 'email') in (select lower(email) from public.admin_users)
  );

-- ── profiles: billing cycle + subscription start date ──────────────────
alter table public.profiles
  add column if not exists billing_cycle text check (billing_cycle in ('monthly', 'yearly')) default 'monthly',
  add column if not exists subscription_start_date date;
