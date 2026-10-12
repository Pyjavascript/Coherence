-- Daily credits. The generate Edge Function writes one row per successful AI
-- call (kind = the generation type). The daily limit, my_usage() and the Usage
-- dialog's credit lines all count these rows, so they always agree.
-- A credit day runs from UTC midnight to UTC midnight.
-- user_usage / bump_usage are no longer used.

create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_created_idx on public.usage_events(user_id, created_at);

-- Users read their own events; only the Edge Function (service role) writes.
alter table public.usage_events enable row level security;
drop policy if exists "read own usage events" on public.usage_events;
create policy "read own usage events" on public.usage_events
  for select to authenticated using (user_id = auth.uid());

-- Start of the current credit day (UTC midnight).
create or replace function public.usage_day_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

-- { brands, generations } for the signed-in user; generations = today's credits.
drop function if exists public.my_usage();
create function public.my_usage()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'brands', (select count(*) from public.brands where user_id = auth.uid()),
    'generations', (
      select count(*) from public.usage_events
      where user_id = auth.uid() and created_at >= public.usage_day_start()
    )
  );
$$;

revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;
