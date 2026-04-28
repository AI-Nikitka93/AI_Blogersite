alter table public.posts
  add column if not exists reasoning text not null default '';

alter table public.posts
  add column if not exists confidence text not null default 'medium';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_confidence_check'
  ) then
    alter table public.posts
      add constraint posts_confidence_check
      check (confidence in ('high', 'medium', 'low'));
  end if;
end $$;
