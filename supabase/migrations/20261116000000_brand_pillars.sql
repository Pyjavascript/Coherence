-- Brand panel: "Create brand pillars". Up to three short statements the copy
-- should embody; every generation prompt carries them.

alter table public.brands
  add column if not exists pillars jsonb not null default '[]'::jsonb;

alter table public.brands
  drop constraint if exists brands_pillars_is_array;

alter table public.brands
  add constraint brands_pillars_is_array check (
    jsonb_typeof(pillars) = 'array' and jsonb_array_length(pillars) <= 3
  );
