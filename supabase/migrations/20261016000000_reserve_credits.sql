-- Atomic credit check. The generate Edge Function reserves a call's credits
-- (one usage_events row each) before calling OpenAI, and deletes them again if
-- the call fails, so only answered calls are charged.
--
-- Checking and writing happen under a per-user lock, so parallel requests
-- (Node Studio's "Generate all", several tabs) can't all pass the check and
-- go past the daily limit together.

alter table public.usage_events
  add column if not exists source text not null default 'web';

create or replace function public.reserve_credits(
  p_user      uuid,
  p_kind      text,
  p_source    text,
  p_count     int,
  p_daily_max int,
  p_hook_max  int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  used  int;
  hooks int;
  ids   uuid[];
begin
  if p_count is null or p_count < 1 then
    raise exception 'p_count must be at least 1';
  end if;

  -- Held until this transaction ends: one reservation per user at a time.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select count(*) into used
  from public.usage_events
  where user_id = p_user and created_at >= public.usage_day_start();

  if used + p_count > p_daily_max then
    return json_build_object('ok', false, 'code', 'limit_reached', 'used', used);
  end if;

  if p_kind = 'hook' then
    select count(*) into hooks
    from public.usage_events
    where user_id = p_user and kind = 'hook' and created_at >= public.usage_day_start();
    if hooks >= p_hook_max then
      return json_build_object('ok', false, 'code', 'hook_limit', 'used', used);
    end if;
  end if;

  with inserted as (
    insert into public.usage_events (user_id, kind, source)
    select p_user, p_kind, coalesce(p_source, 'web')
    from generate_series(1, p_count)
    returning id
  )
  select array_agg(id) into ids from inserted;

  return json_build_object('ok', true, 'ids', ids, 'used', used + p_count);
end;
$$;

-- Only the Edge Function (service role) may reserve credits.
revoke all on function public.reserve_credits(uuid, text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid, text, text, int, int, int) to service_role;
