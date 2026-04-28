alter table public.posts
  add column if not exists opinion text not null default '';

update public.posts
set opinion = case
  when nullif(trim(opinion), '') is not null then opinion
  when nullif(trim(cross_signal), '') is not null then cross_signal
  when nullif(trim(hypothesis), '') is not null then hypothesis
  else reasoning
end
where nullif(trim(opinion), '') is null;
