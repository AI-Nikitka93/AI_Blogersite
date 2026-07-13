-- Durable per-slot operational ledger. A quality skip and a technical failure
-- are different outcomes, so neither belongs only in an opaque run log.
create table if not exists public.publication_slots (
  slot_date date not null,
  slot_key text not null,
  scheduled_topic text not null,
  status text not null check (status in ('published', 'skipped_quality', 'failed_technical')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  trace_id text,
  post_id uuid references public.posts(id) on delete set null,
  reason text,
  first_attempt_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  primary key (slot_date, slot_key)
);

create index if not exists idx_publication_slots_date_status
  on public.publication_slots (slot_date desc, status);

alter table public.publication_slots enable row level security;

drop policy if exists "service role can manage publication slots" on public.publication_slots;
create policy "service role can manage publication slots"
  on public.publication_slots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- A late duplicate callback must never downgrade an already published slot.
create or replace function public.record_publication_slot_outcome(
  p_slot_date date,
  p_slot_key text,
  p_scheduled_topic text,
  p_status text,
  p_trace_id text,
  p_post_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.publication_slots (
    slot_date, slot_key, scheduled_topic, status, trace_id, post_id, reason
  )
  values (
    p_slot_date, p_slot_key, p_scheduled_topic, p_status, p_trace_id, p_post_id, p_reason
  )
  on conflict (slot_date, slot_key) do update
  set
    attempt_count = public.publication_slots.attempt_count + 1,
    status = case
      when public.publication_slots.status = 'published' then 'published'
      when excluded.status = 'published' then 'published'
      else excluded.status
    end,
    trace_id = case
      when public.publication_slots.status = 'published' then public.publication_slots.trace_id
      else excluded.trace_id
    end,
    post_id = coalesce(public.publication_slots.post_id, excluded.post_id),
    reason = case
      when public.publication_slots.status = 'published' then public.publication_slots.reason
      else excluded.reason
    end,
    completed_at = now();
end;
$$;

revoke all on function public.record_publication_slot_outcome(date, text, text, text, text, uuid, text) from public;
grant execute on function public.record_publication_slot_outcome(date, text, text, text, text, uuid, text) to service_role;
