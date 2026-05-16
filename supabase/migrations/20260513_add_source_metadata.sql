alter table public.posts
  add column if not exists source_url text,
  add column if not exists source_published_at timestamptz,
  add column if not exists event_date date,
  add column if not exists corroborating_sources jsonb;

create index if not exists idx_posts_source_published_at
  on public.posts (source_published_at desc);

create index if not exists idx_posts_event_date
  on public.posts (event_date desc);
