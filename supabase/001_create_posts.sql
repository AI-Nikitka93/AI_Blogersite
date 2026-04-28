create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  observed jsonb not null,
  inferred text not null,
  opinion text not null default '',
  cross_signal text not null,
  hypothesis text not null,
  reasoning text not null,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  category text not null check (category in ('World', 'Tech', 'Sports', 'Markets')),
  created_at timestamptz not null default now(),
  constraint posts_observed_is_array check (jsonb_typeof(observed) = 'array')
);

create index if not exists idx_posts_category_created_at
  on public.posts (category, created_at desc);

create index if not exists idx_posts_created_at
  on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Public can read posts" on public.posts;
create policy "Public can read posts"
on public.posts
for select
to anon, authenticated
using (true);

-- No public write policies are created.
-- service_role bypasses RLS and is intended for server-side cron inserts.
