create extension if not exists pg_trgm;

create or replace function check_novelty(
  new_title text,
  target_category text,
  similarity_threshold float default 0.4,
  days_lookback int default 7
)
returns boolean as $$
declare
  is_novel boolean;
begin
  select not exists (
    select 1
    from public.posts
    where category = target_category
      and created_at >= now() - (days_lookback || ' days')::interval
      and similarity(title, new_title) > similarity_threshold
  ) into is_novel;

  return is_novel;
end;
$$ language plpgsql;
