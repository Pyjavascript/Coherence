-- Where a credit was spent: 'web' (the app) or 'figma' (the plugin, signed in
-- with a plugin key). The Usage dialog colours Figma credits on their own.

alter table public.usage_events
  add column if not exists source text not null default 'web';
