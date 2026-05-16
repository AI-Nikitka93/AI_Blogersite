create table if not exists public.quality_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trace_id text not null,
  topic text,
  status text not null,
  reason text,
  post_id uuid references public.posts(id) on delete set null,
  prompt_version text,
  fallback_mode text,
  risk_level text not null default 'low',
  quality_flags jsonb not null default '[]'::jsonb,
  category_balance jsonb
);

create index if not exists idx_quality_events_created_at
  on public.quality_events (created_at desc);

create index if not exists idx_quality_events_trace_id
  on public.quality_events (trace_id);

create index if not exists idx_quality_events_risk_level_created_at
  on public.quality_events (risk_level, created_at desc);

alter table public.quality_events enable row level security;

drop policy if exists "service role can manage quality events" on public.quality_events;
create policy "service role can manage quality events"
  on public.quality_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
