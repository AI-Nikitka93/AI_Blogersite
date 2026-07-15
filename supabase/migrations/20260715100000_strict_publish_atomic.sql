create or replace function public.publish_post_atomically(
  p_title text,
  p_source text,
  p_source_url text,
  p_source_published_at timestamptz,
  p_event_date date,
  p_corroborating_sources jsonb,
  p_observed jsonb,
  p_inferred text,
  p_opinion text,
  p_cross_signal text,
  p_hypothesis text,
  p_reasoning text,
  p_confidence text,
  p_category text,
  p_slot_date date,
  p_slot_key text,
  p_scheduled_topic text,
  p_trace_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing_status text;
  v_post_id uuid;
  v_created_at timestamptz;
begin
  -- 1. Row-level lock to prevent concurrent double publishing
  if p_slot_key is not null then
    select status into v_existing_status
    from public.publication_slots
    where slot_date = p_slot_date and slot_key = p_slot_key
    for update;

    -- If already successfully processed by a concurrent run, abort
    if v_existing_status in ('published', 'skipped_quality') then
      return jsonb_build_object('error', 'Slot already filled by a concurrent process');
    end if;
  end if;

  -- 2. Insert the post (default telegram_publish_status = 'pending')
  insert into public.posts (
    title, source, source_url, source_published_at, event_date,
    corroborating_sources, observed, inferred, opinion, cross_signal,
    hypothesis, reasoning, confidence, category, telegram_publish_status
  )
  values (
    p_title, p_source, p_source_url, p_source_published_at, p_event_date,
    p_corroborating_sources, p_observed, p_inferred, p_opinion, p_cross_signal,
    p_hypothesis, p_reasoning, p_confidence, p_category, 'pending'
  )
  returning id, created_at into v_post_id, v_created_at;

  -- 3. Record outcome atomically
  if p_slot_key is not null then
    insert into public.publication_slots (
      slot_date, slot_key, scheduled_topic, status, trace_id, post_id, reason
    )
    values (
      p_slot_date, p_slot_key, p_scheduled_topic, 'published', p_trace_id, v_post_id, null
    )
    on conflict (slot_date, slot_key) do update
    set
      attempt_count = public.publication_slots.attempt_count + 1,
      status = 'published',
      trace_id = excluded.trace_id,
      post_id = v_post_id,
      reason = null,
      completed_at = now();
  end if;

  return jsonb_build_object('id', v_post_id, 'created_at', v_created_at);
end;
$$;

-- Add new columns for outbox pattern
alter table public.posts 
add column if not exists telegram_publish_status text default 'pending',
add column if not exists telegram_message_id bigint;
