-- Advanced Behaviour: the market the copy is for and the language it's written in.

alter table public.brands
  add column if not exists location text not null default '',
  add column if not exists language text not null default 'English';
