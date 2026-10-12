-- Lets a signed-in user delete their own account from the profile dialog.
-- The anon key can't touch auth.users, so this runs as the function owner.
-- brands / generations reference auth.users without ON DELETE CASCADE, so
-- their rows go first; research notes and nodes cascade from brands.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.generations where user_id = uid;
  delete from public.brands      where user_id = uid;
  delete from public.user_usage  where user_id = uid;
  delete from auth.users         where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
