-- Per-user preferences, one row per user. copy_layout is the "Select a layout"
-- tile the user picked last (an id from _shared/layouts.js; 0 = the default
-- tile): every new card, every starter card and every card with no copy yet
-- takes it, on any brand and after a reload.
--
-- Superseded by 20261124120000_user_settings_layout_per_medium.sql, which
-- replaces copy_layout with copy_layouts (one pick per medium).

create table if not exists public.user_settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  copy_layout smallint not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "read own settings" on public.user_settings;
create policy "read own settings" on public.user_settings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "insert own settings" on public.user_settings;
create policy "insert own settings" on public.user_settings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own settings" on public.user_settings;
create policy "update own settings" on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Deleting an account removes the row too (the foreign key cascades from
-- auth.users, which delete_own_account() deletes last).
