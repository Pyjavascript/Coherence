-- The "Select a layout" pick is remembered per medium, not for the whole
-- account: picking a layout on a Social card changes Social cards only (in
-- Quick Grid and Node Studio alike), and Email, Website, Packaging and
-- Advertising keep their own.
--
-- copy_layouts maps a medium to its tile id (from _shared/layouts.js), e.g.
-- {"social": 2, "email": 4}. Media keys are Node Studio's categories: email,
-- social, website, packaging, advertising (Quick Grid's "marketing" card is
-- stored as "social"). A medium left out uses the default tile (0).

alter table public.user_settings
  add column if not exists copy_layouts jsonb not null default '{}'::jsonb;

alter table public.user_settings
  drop constraint if exists user_settings_copy_layouts_object;
alter table public.user_settings
  add constraint user_settings_copy_layouts_object check (jsonb_typeof(copy_layouts) = 'object');

-- The old single, account-wide pick put one layout on every card. It isn't
-- carried over (there's no telling which medium it was picked on).
alter table public.user_settings
  drop column if exists copy_layout;
