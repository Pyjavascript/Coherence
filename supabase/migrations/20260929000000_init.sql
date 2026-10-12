-- Brand Language OS — initial schema (no auth yet; open policies for development)

create extension if not exists "pgcrypto";

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  scope       text not null default 'regular' check (scope in ('regular','global')),
  belief      text not null default '',
  industry    text not null default 'general',
  stage       text not null default 'Discovery',
  mode        text not null default 'Emotional',
  audience    text not null default 'Cold — scrolling, distracted',
  pain        text not null default '',
  emo         text not null default 'Curiosity',
  formality   text not null default 'Conversational',
  objection   text not null default '',
  cta         text not null default 'Soft',
  banned      text not null default '',
  must_include text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.research_notes (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  type        text not null,
  text        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists research_notes_brand_idx on public.research_notes(brand_id);

create table if not exists public.generations (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid references public.brands(id) on delete cascade,
  medium        text not null,
  input_context jsonb,
  output        jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists generations_brand_idx on public.generations(brand_id);

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists brands_updated_at on public.brands;
create trigger brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
drop trigger if exists research_notes_updated_at on public.research_notes;
create trigger research_notes_updated_at before update on public.research_notes
  for each row execute function public.set_updated_at();

-- Row Level Security. v1 has no login, so anon may read/write.
-- IMPORTANT: replace these with per-user policies when you add auth.
alter table public.brands         enable row level security;
alter table public.research_notes enable row level security;
alter table public.generations    enable row level security;

create policy "dev open access" on public.brands         for all to anon, authenticated using (true) with check (true);
create policy "dev open access" on public.research_notes for all to anon, authenticated using (true) with check (true);
create policy "dev open access" on public.generations    for all to anon, authenticated using (true) with check (true);
