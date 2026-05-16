create extension if not exists pgcrypto;

alter table public.posts
  add column if not exists source text;

create table if not exists public.run_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trace_id text not null,
  topic text,
  status text not null check (status in ('success', 'skipped', 'failed')),
  reason text,
  post_id uuid,
  duration_ms integer
);

create index if not exists idx_run_history_created_at
  on public.run_history (created_at desc);

create index if not exists idx_run_history_status_created_at
  on public.run_history (status, created_at desc);

create index if not exists idx_run_history_trace_id
  on public.run_history (trace_id);

alter table public.run_history enable row level security;

-- No public policies are created.
-- service_role bypasses RLS and is intended for server-side cron inserts.
