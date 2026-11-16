-- Brand panel → Language tab: the brand's personality, its writing rules, a
-- voice / tone sample and the Cold / Neutral / Warm slider (0-100, 50 =
-- neutral). Words to avoid reuse the existing brands.banned column.

alter table public.brands
  add column if not exists personality text not null default '',
  add column if not exists writing_rules text not null default '',
  add column if not exists voice_sample text not null default '',
  add column if not exists warmth smallint not null default 50;

alter table public.brands
  drop constraint if exists brands_warmth_range;

alter table public.brands
  add constraint brands_warmth_range check (warmth between 0 and 100);
